#!/usr/bin/env python3
"""
Stable Diffusion Generator - Called from Next.js API routes
"""

import sys
import json
import base64
import io
from typing import Optional

import torch
from diffusers import (
    StableDiffusionPipeline,
    StableDiffusionImg2ImgPipeline,
    DPMSolverMultistepScheduler
)
from PIL import Image


class StableDiffusionGenerator:
    _instance = None
    _pipe = None
    _img2img_pipe = None
    _model_id = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self, model_id: str = "runwayml/stable-diffusion-v1-5"):
        if self._pipe is not None and self._model_id == model_id:
            return True

        # Determine device and dtype
        if torch.cuda.is_available():
            device = "cuda"
            dtype = torch.float16
        else:
            device = "cpu"
            dtype = torch.float32

        # Load pipeline
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

        # Create img2img pipeline sharing components
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

        # Memory optimizations
        if device == "cuda":
            self._pipe.enable_attention_slicing()
            self._img2img_pipe.enable_attention_slicing()
            try:
                self._pipe.enable_xformers_memory_efficient_attention()
                self._img2img_pipe.enable_xformers_memory_efficient_attention()
            except:
                pass

        self._model_id = model_id
        self._device = device
        return True

    def txt2img(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 512,
        height: int = 512,
        steps: int = 30,
        guidance_scale: float = 7.5,
        seed: Optional[int] = None,
        num_images: int = 1
    ) -> list:
        if self._pipe is None:
            self.load_model()

        generator = None
        if seed is not None:
            generator = torch.Generator(device=self._device).manual_seed(seed)

        result = self._pipe(
            prompt=prompt,
            negative_prompt=negative_prompt or None,
            width=width,
            height=height,
            num_inference_steps=steps,
            guidance_scale=guidance_scale,
            generator=generator,
            num_images_per_prompt=num_images
        )

        return [self._encode_image(img) for img in result.images]

    def img2img(
        self,
        prompt: str,
        init_image_b64: str,
        negative_prompt: str = "",
        strength: float = 0.75,
        steps: int = 30,
        guidance_scale: float = 7.5,
        seed: Optional[int] = None,
        num_images: int = 1
    ) -> list:
        if self._img2img_pipe is None:
            self.load_model()

        # Decode input image
        image_data = base64.b64decode(init_image_b64)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")

        generator = None
        if seed is not None:
            generator = torch.Generator(device=self._device).manual_seed(seed)

        result = self._img2img_pipe(
            prompt=prompt,
            image=image,
            negative_prompt=negative_prompt or None,
            strength=strength,
            num_inference_steps=steps,
            guidance_scale=guidance_scale,
            generator=generator,
            num_images_per_prompt=num_images
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
            "device": getattr(self, '_device', None)
        }


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
            model_id = sys.argv[2] if len(sys.argv) > 2 else "runwayml/stable-diffusion-v1-5"
            gen.load_model(model_id)
            result = {"status": "success", "model_id": model_id}

        elif command == "txt2img":
            # Read params from stdin
            params = json.loads(sys.stdin.read())
            images = gen.txt2img(
                prompt=params["prompt"],
                negative_prompt=params.get("negative_prompt", ""),
                width=params.get("width", 512),
                height=params.get("height", 512),
                steps=params.get("steps", 30),
                guidance_scale=params.get("guidance_scale", 7.5),
                seed=params.get("seed"),
                num_images=params.get("num_images", 1)
            )
            result = {"images": images}

        elif command == "img2img":
            # Read params from stdin
            params = json.loads(sys.stdin.read())
            images = gen.img2img(
                prompt=params["prompt"],
                init_image_b64=params["init_image"],
                negative_prompt=params.get("negative_prompt", ""),
                strength=params.get("strength", 0.75),
                steps=params.get("steps", 30),
                guidance_scale=params.get("guidance_scale", 7.5),
                seed=params.get("seed"),
                num_images=params.get("num_images", 1)
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
