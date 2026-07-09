#!/usr/bin/env python3
"""
Stable Diffusion Generator - Called from Next.js API routes
Supports model selection, LoRA, ControlNet, batch processing
"""

import sys
import json
import base64
import io
import os
from typing import Optional, List, Dict, Any
from pathlib import Path

import torch
from diffusers import (
    StableDiffusionPipeline,
    StableDiffusionImg2ImgPipeline,
    StableDiffusionControlNetPipeline,
    ControlNetModel,
    DPMSolverMultistepScheduler,
    DDIMScheduler,
    PNDMScheduler,
    EulerDiscreteScheduler,
    EulerAncestralDiscreteScheduler,
    LMSDiscreteScheduler,
    HeunDiscreteScheduler,
    KDPM2DiscreteScheduler,
    KDPM2AncestralDiscreteScheduler,
    UniPCMultistepScheduler,
)
from PIL import Image

MODELS_DIR = Path(os.environ.get("SD_MODELS_DIR", "./models"))
LORAS_DIR = Path(os.environ.get("SD_LORAS_DIR", "./loras"))
CONTROLNET_DIR = Path(os.environ.get("SD_CONTROLNET_DIR", "./controlnets"))

DEFAULT_MODEL_ID = "stable-diffusion-v1-5/stable-diffusion-v1-5"

DEFAULT_MODELS = [
    {"id": DEFAULT_MODEL_ID, "name": "Stable Diffusion v1.5", "path": DEFAULT_MODEL_ID},
    {"id": "stabilityai/stable-diffusion-2-1", "name": "Stable Diffusion v2.1", "path": "stabilityai/stable-diffusion-2-1"},
    {"id": "CompVis/stable-diffusion-v1-4", "name": "Stable Diffusion v1.4", "path": "CompVis/stable-diffusion-v1-4"},
]

CONTROLNET_MODELS = [
    {"name": "lllyasviel/sd-controlnet-canny", "type": "canny"},
    {"name": "lllyasviel/sd-controlnet-depth", "type": "depth"},
    {"name": "lllyasviel/sd-controlnet-openpose", "type": "openpose"},
    {"name": "lllyasviel/sd-controlnet-scribble", "type": "scribble"},
    {"name": "lllyasviel/sd-controlnet-hed", "type": "hed"},
    {"name": "lllyasviel/sd-controlnet-mlsd", "type": "mlsd"},
    {"name": "lllyasviel/sd-controlnet-seg", "type": "seg"},
    {"name": "lllyasviel/sd-controlnet-normal", "type": "normal"},
]

SCHEDULERS = {
    "dpm++_2m": DPMSolverMultistepScheduler,
    "dpm++_2m_karras": lambda config: DPMSolverMultistepScheduler.from_config(config, use_karras_sigmas=True),
    "dpm++_sde": lambda config: DPMSolverMultistepScheduler.from_config(config, algorithm_type="sde-dpmsolver++"),
    "dpm++_sde_karras": lambda config: DPMSolverMultistepScheduler.from_config(config, algorithm_type="sde-dpmsolver++", use_karras_sigmas=True),
    "ddim": DDIMScheduler,
    "pndm": PNDMScheduler,
    "euler": EulerDiscreteScheduler,
    "euler_a": EulerAncestralDiscreteScheduler,
    "lms": LMSDiscreteScheduler,
    "heun": HeunDiscreteScheduler,
    "dpm2": KDPM2DiscreteScheduler,
    "dpm2_a": KDPM2AncestralDiscreteScheduler,
    "unipc": UniPCMultistepScheduler,
}

SAMPLER_LIST = [
    {"id": "dpm++_2m", "name": "DPM++ 2M"},
    {"id": "dpm++_2m_karras", "name": "DPM++ 2M Karras"},
    {"id": "dpm++_sde", "name": "DPM++ SDE"},
    {"id": "dpm++_sde_karras", "name": "DPM++ SDE Karras"},
    {"id": "euler", "name": "Euler"},
    {"id": "euler_a", "name": "Euler Ancestral"},
    {"id": "ddim", "name": "DDIM"},
    {"id": "pndm", "name": "PNDM"},
    {"id": "lms", "name": "LMS"},
    {"id": "heun", "name": "Heun"},
    {"id": "dpm2", "name": "DPM2"},
    {"id": "dpm2_a", "name": "DPM2 Ancestral"},
    {"id": "unipc", "name": "UniPC"},
]


class StableDiffusionGenerator:
    _instance = None
    _pipe = None
    _img2img_pipe = None
    _controlnet_pipe = None
    _model_id = None
    _loaded_loras: List[str] = []
    _controlnet_model = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self, model_id: str = DEFAULT_MODEL_ID):
        if self._pipe is not None and self._model_id == model_id:
            return True

        if torch.cuda.is_available():
            device = "cuda"
            dtype = torch.float16
        elif torch.backends.mps.is_available():
            device = "mps"
            dtype = torch.float32
        else:
            device = "cpu"
            dtype = torch.float32

        self._pipe = StableDiffusionPipeline.from_pretrained(
            model_id,
            torch_dtype=dtype,
            safety_checker=None,
            requires_safety_checker=False
        )
        self._pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            self._pipe.scheduler.config
        )
        self._pipe = self._pipe.to(device)
        print(f"[SD Generator] Model loaded on device: {device}, dtype: {dtype}", file=sys.stderr)

        self._img2img_pipe = StableDiffusionImg2ImgPipeline(
            vae=self._pipe.vae,
            text_encoder=self._pipe.text_encoder,
            tokenizer=self._pipe.tokenizer,
            unet=self._pipe.unet,
            scheduler=self._pipe.scheduler,
            safety_checker=None,
            feature_extractor=self._pipe.feature_extractor,
            requires_safety_checker=False
        )

        if device in ("cuda", "mps"):
            self._pipe.enable_attention_slicing()
            self._img2img_pipe.enable_attention_slicing()
            if device == "cuda":
                try:
                    self._pipe.enable_xformers_memory_efficient_attention()
                    self._img2img_pipe.enable_xformers_memory_efficient_attention()
                except:
                    pass

        self._model_id = model_id
        self._device = device
        self._dtype = dtype
        self._loaded_loras = []
        return True

    def load_lora(self, lora_path: str, weight: float = 1.0):
        """Load a LoRA model"""
        if self._pipe is None:
            self.load_model()

        try:
            self._pipe.load_lora_weights(lora_path)
            self._pipe.fuse_lora(lora_scale=weight)
            self._loaded_loras.append(lora_path)
            return True
        except Exception as e:
            print(f"Failed to load LoRA: {e}", file=sys.stderr)
            return False

    def unload_loras(self):
        """Unload all LoRA models"""
        if self._pipe is not None and self._loaded_loras:
            try:
                self._pipe.unfuse_lora()
                self._pipe.unload_lora_weights()
                self._loaded_loras = []
            except Exception as e:
                print(f"Failed to unload LoRA: {e}", file=sys.stderr)

    def set_scheduler(self, sampler_id: str):
        """Set the scheduler for the pipeline"""
        if self._pipe is None:
            return

        if sampler_id not in SCHEDULERS:
            sampler_id = "dpm++_2m"

        scheduler_class = SCHEDULERS[sampler_id]

        if callable(scheduler_class) and not isinstance(scheduler_class, type):
            self._pipe.scheduler = scheduler_class(self._pipe.scheduler.config)
        else:
            self._pipe.scheduler = scheduler_class.from_config(self._pipe.scheduler.config)

        if self._img2img_pipe is not None:
            self._img2img_pipe.scheduler = self._pipe.scheduler

        if self._controlnet_pipe is not None:
            self._controlnet_pipe.scheduler = self._pipe.scheduler

    def load_controlnet(self, controlnet_name: str):
        """Load a ControlNet model"""
        if self._controlnet_model is not None and self._controlnet_model == controlnet_name:
            return True

        try:
            controlnet = ControlNetModel.from_pretrained(
                controlnet_name,
                torch_dtype=self._dtype if hasattr(self, '_dtype') else torch.float16
            )

            if self._pipe is None:
                self.load_model()

            self._controlnet_pipe = StableDiffusionControlNetPipeline(
                vae=self._pipe.vae,
                text_encoder=self._pipe.text_encoder,
                tokenizer=self._pipe.tokenizer,
                unet=self._pipe.unet,
                scheduler=self._pipe.scheduler,
                safety_checker=None,
                feature_extractor=self._pipe.feature_extractor,
                controlnet=controlnet,
                requires_safety_checker=False
            )
            self._controlnet_pipe = self._controlnet_pipe.to(self._device)
            self._controlnet_model = controlnet_name
            return True
        except Exception as e:
            print(f"Failed to load ControlNet: {e}", file=sys.stderr)
            return False

    def txt2img(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 512,
        height: int = 512,
        steps: int = 30,
        guidance_scale: float = 7.5,
        seed: Optional[int] = None,
        num_images: int = 1,
        model_id: Optional[str] = None,
        lora: Optional[Dict[str, Any]] = None,
        controlnet: Optional[Dict[str, Any]] = None,
        sampler: Optional[str] = None
    ) -> list:
        print(f"[SD Generator] txt2img called, current device: {getattr(self, '_device', 'not set')}", file=sys.stderr)
        if model_id and model_id != self._model_id:
            self.load_model(model_id)
        elif self._pipe is None:
            self.load_model()

        if sampler:
            self.set_scheduler(sampler)

        self.unload_loras()
        if lora and lora.get("enabled") and lora.get("modelPath"):
            self.load_lora(lora["modelPath"], lora.get("weight", 1.0))

        generator = None
        if seed is not None:
            generator = torch.Generator(device=self._device).manual_seed(seed)

        if controlnet and controlnet.get("enabled") and controlnet.get("modelName") and controlnet.get("controlImage"):
            self.load_controlnet(controlnet["modelName"])
            control_image_data = base64.b64decode(controlnet["controlImage"])
            control_image = Image.open(io.BytesIO(control_image_data)).convert("RGB")
            control_image = control_image.resize((width, height))

            self._current_total_steps = steps
            result = self._controlnet_pipe(
                prompt=prompt,
                negative_prompt=negative_prompt or None,
                image=control_image,
                width=width,
                height=height,
                num_inference_steps=steps,
                guidance_scale=guidance_scale,
                generator=generator,
                num_images_per_prompt=num_images,
                controlnet_conditioning_scale=controlnet.get("weight", 1.0),
                control_guidance_start=controlnet.get("guidanceStart", 0.0),
                control_guidance_end=controlnet.get("guidanceEnd", 1.0),
                callback_on_step_end=self._progress_callback,
            )
        else:
            self._current_total_steps = steps
            result = self._pipe(
                prompt=prompt,
                negative_prompt=negative_prompt or None,
                width=width,
                height=height,
                num_inference_steps=steps,
                guidance_scale=guidance_scale,
                generator=generator,
                num_images_per_prompt=num_images,
                callback_on_step_end=self._progress_callback,
            )

        return [self._encode_image(img) for img in result.images]

    def _progress_callback(self, pipe, step: int, timestep: int, callback_kwargs: dict):
        total_steps = getattr(self, '_current_total_steps', 30)
        progress = int((step / total_steps) * 100)
        print(json.dumps({"type": "progress", "step": step, "total": total_steps, "progress": progress}), file=sys.stderr, flush=True)
        return callback_kwargs

    def img2img(
        self,
        prompt: str,
        init_image_b64: str,
        negative_prompt: str = "",
        strength: float = 0.75,
        steps: int = 30,
        guidance_scale: float = 7.5,
        seed: Optional[int] = None,
        num_images: int = 1,
        model_id: Optional[str] = None,
        lora: Optional[Dict[str, Any]] = None,
        controlnet: Optional[Dict[str, Any]] = None,
        sampler: Optional[str] = None
    ) -> list:
        print(f"[SD Generator] img2img called, current device: {getattr(self, '_device', 'not set')}", file=sys.stderr)
        if model_id and model_id != self._model_id:
            self.load_model(model_id)
        elif self._img2img_pipe is None:
            self.load_model()

        if sampler:
            self.set_scheduler(sampler)

        self.unload_loras()
        if lora and lora.get("enabled") and lora.get("modelPath"):
            self.load_lora(lora["modelPath"], lora.get("weight", 1.0))

        image_data = base64.b64decode(init_image_b64)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")

        generator = None
        if seed is not None:
            generator = torch.Generator(device=self._device).manual_seed(seed)

        self._current_total_steps = steps
        result = self._img2img_pipe(
            prompt=prompt,
            image=image,
            negative_prompt=negative_prompt or None,
            strength=strength,
            num_inference_steps=steps,
            guidance_scale=guidance_scale,
            generator=generator,
            num_images_per_prompt=num_images,
            callback_on_step_end=self._progress_callback,
        )

        return [self._encode_image(img) for img in result.images]

    def _encode_image(self, image: Image.Image) -> str:
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode()

    def get_info(self) -> dict:
        return {
            "model_id": self._model_id,
            "loaded": self._pipe is not None,
            "cuda_available": torch.cuda.is_available(),
            "mps_available": torch.backends.mps.is_available(),
            "device": getattr(self, '_device', None),
            "loaded_loras": self._loaded_loras,
            "controlnet_model": self._controlnet_model,
        }

    @staticmethod
    def list_models() -> dict:
        """List available models"""
        models = DEFAULT_MODELS.copy()

        if MODELS_DIR.exists():
            for model_path in MODELS_DIR.glob("*"):
                if model_path.is_dir() or model_path.suffix in [".safetensors", ".ckpt"]:
                    models.append({
                        "id": str(model_path),
                        "name": model_path.stem,
                        "path": str(model_path)
                    })

        return {"models": models}

    @staticmethod
    def list_loras() -> dict:
        """List available LoRA models"""
        loras = []

        if LORAS_DIR.exists():
            for lora_path in LORAS_DIR.glob("*.safetensors"):
                loras.append({
                    "name": lora_path.stem,
                    "path": str(lora_path)
                })

        return {"loras": loras}

    @staticmethod
    def list_controlnets() -> dict:
        """List available ControlNet models"""
        return {"controlnets": CONTROLNET_MODELS}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command specified"}))
        sys.exit(1)

    command = sys.argv[1]
    gen = StableDiffusionGenerator.get_instance()

    try:
        if command == "info":
            result = gen.get_info()

        elif command == "load":
            model_id = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_MODEL_ID
            gen.load_model(model_id)
            result = {"status": "success", "model_id": model_id}

        elif command == "list_models":
            result = gen.list_models()

        elif command == "list_loras":
            result = gen.list_loras()

        elif command == "list_controlnets":
            result = gen.list_controlnets()

        elif command == "list_samplers":
            result = {"samplers": SAMPLER_LIST}

        elif command == "txt2img":
            params = json.loads(sys.stdin.read())
            images = gen.txt2img(
                prompt=params["prompt"],
                negative_prompt=params.get("negative_prompt", ""),
                width=params.get("width", 512),
                height=params.get("height", 512),
                steps=params.get("steps", 30),
                guidance_scale=params.get("guidance_scale", 7.5),
                seed=params.get("seed"),
                num_images=params.get("num_images", 1),
                model_id=params.get("model_id"),
                lora=params.get("lora"),
                controlnet=params.get("controlnet"),
                sampler=params.get("sampler"),
            )
            result = {"images": images}

        elif command == "img2img":
            params = json.loads(sys.stdin.read())
            images = gen.img2img(
                prompt=params["prompt"],
                init_image_b64=params["init_image"],
                negative_prompt=params.get("negative_prompt", ""),
                strength=params.get("strength", 0.75),
                steps=params.get("steps", 30),
                guidance_scale=params.get("guidance_scale", 7.5),
                seed=params.get("seed"),
                num_images=params.get("num_images", 1),
                model_id=params.get("model_id"),
                lora=params.get("lora"),
                controlnet=params.get("controlnet"),
                sampler=params.get("sampler"),
            )
            result = {"images": images}

        else:
            result = {"error": f"Unknown command: {command}"}

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
