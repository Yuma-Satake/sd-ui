#!/usr/bin/env python3
"""
Image Generator - Juggernaut XL v9 (SDXL fine-tune) on Apple Silicon (MPS, bfloat16).
"""

import sys
import json
import base64
import io
import random
from typing import Optional

import torch
from diffusers import (
    AutoencoderKL,
    StableDiffusionXLPipeline,
    StableDiffusionXLImg2ImgPipeline,
    DPMSolverMultistepScheduler,
)
from PIL import Image

MODEL_ID = "RunDiffusion/Juggernaut-XL-v9"
VAE_ID = "madebyollin/sdxl-vae-fp16-fix"


class ImageGenerator:
    _instance = None

    def __init__(self):
        self._pipe: Optional[StableDiffusionXLPipeline] = None
        self._img2img_pipe: Optional[StableDiffusionXLImg2ImgPipeline] = None
        self._device: str = ""
        self._dtype: torch.dtype = torch.float16
        self._current_total_steps: int = 0

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self):
        if self._pipe is not None:
            return

        if not torch.backends.mps.is_available():
            raise RuntimeError(
                "This app requires Apple Silicon (M-series) with MPS support."
            )

        self._device = "mps"
        vae = AutoencoderKL.from_pretrained(VAE_ID, torch_dtype=self._dtype)
        pipe = StableDiffusionXLPipeline.from_pretrained(
            MODEL_ID,
            vae=vae,
            torch_dtype=self._dtype,
            variant="fp16",
            use_safetensors=True,
            add_watermarker=False,
        ).to(self._device)

        pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            pipe.scheduler.config,
            use_karras_sigmas=True,
            algorithm_type="dpmsolver++",
        )

        pipe.set_progress_bar_config(disable=True)

        self._pipe = pipe
        self._img2img_pipe = StableDiffusionXLImg2ImgPipeline(
            vae=pipe.vae,
            text_encoder=pipe.text_encoder,
            text_encoder_2=pipe.text_encoder_2,
            tokenizer=pipe.tokenizer,
            tokenizer_2=pipe.tokenizer_2,
            unet=pipe.unet,
            scheduler=pipe.scheduler,
            add_watermarker=False,
        )
        self._img2img_pipe.set_progress_bar_config(disable=True)

        print(
            f"[Generator] Juggernaut XL v9 loaded on {self._device}, dtype={self._dtype}",
            file=sys.stderr,
        )

    def _make_generator(self, seed: Optional[int]) -> Optional[torch.Generator]:
        if seed is None:
            return None
        return torch.Generator(device="cpu").manual_seed(seed)

    def _progress_callback(self, pipe, step: int, timestep: int, callback_kwargs: dict):
        total = self._current_total_steps or 1
        done = step + 1
        progress = int((done / total) * 100)
        print(
            json.dumps(
                {"type": "progress", "step": done, "total": total, "progress": progress}
            ),
            file=sys.stderr,
            flush=True,
        )
        return callback_kwargs

    def _resolve_base_seed(self, seed: Optional[int]) -> int:
        if seed is not None:
            return seed
        return random.randint(0, 2**31 - 1)

    def txt2img(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        steps: int = 30,
        guidance_scale: float = 5.0,
        seed: Optional[int] = None,
        num_images: int = 1,
    ) -> tuple:
        self.load_model()
        self._current_total_steps = steps

        base_seed = self._resolve_base_seed(seed)
        images = []
        seeds = []
        for i in range(num_images):
            current_seed = base_seed + i
            result = self._pipe(
                prompt=prompt,
                negative_prompt=negative_prompt or None,
                width=width,
                height=height,
                num_inference_steps=steps,
                guidance_scale=guidance_scale,
                generator=self._make_generator(current_seed),
                num_images_per_prompt=1,
                callback_on_step_end=self._progress_callback,
            )
            images.append(self._encode_image(result.images[0]))
            seeds.append(current_seed)
        return images, seeds

    def img2img(
        self,
        prompt: str,
        init_image_b64: str,
        negative_prompt: str = "",
        strength: float = 0.75,
        steps: int = 30,
        guidance_scale: float = 5.0,
        seed: Optional[int] = None,
        num_images: int = 1,
    ) -> tuple:
        self.load_model()

        image_data = base64.b64decode(init_image_b64)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")

        self._current_total_steps = max(1, int(round(steps * strength)))

        base_seed = self._resolve_base_seed(seed)
        images = []
        seeds = []
        for i in range(num_images):
            current_seed = base_seed + i
            result = self._img2img_pipe(
                prompt=prompt,
                image=image,
                negative_prompt=negative_prompt or None,
                strength=strength,
                num_inference_steps=steps,
                guidance_scale=guidance_scale,
                generator=self._make_generator(current_seed),
                num_images_per_prompt=1,
                callback_on_step_end=self._progress_callback,
            )
            images.append(self._encode_image(result.images[0]))
            seeds.append(current_seed)
        return images, seeds

    def _encode_image(self, image: Image.Image) -> str:
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode()


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command specified"}))
        sys.exit(1)

    command = sys.argv[1]
    gen = ImageGenerator.get_instance()

    try:
        if command == "txt2img":
            params = json.loads(sys.stdin.read())
            images, seeds = gen.txt2img(
                prompt=params["prompt"],
                negative_prompt=params.get("negative_prompt", ""),
                width=params.get("width", 1024),
                height=params.get("height", 1024),
                steps=params.get("steps", 30),
                guidance_scale=params.get("guidance_scale", 5.0),
                seed=params.get("seed"),
                num_images=params.get("num_images", 1),
            )
            result = {"images": images, "seeds": seeds}

        elif command == "img2img":
            params = json.loads(sys.stdin.read())
            images, seeds = gen.img2img(
                prompt=params["prompt"],
                init_image_b64=params["init_image"],
                negative_prompt=params.get("negative_prompt", ""),
                strength=params.get("strength", 0.75),
                steps=params.get("steps", 30),
                guidance_scale=params.get("guidance_scale", 5.0),
                seed=params.get("seed"),
                num_images=params.get("num_images", 1),
            )
            result = {"images": images, "seeds": seeds}

        else:
            result = {"error": f"Unknown command: {command}"}

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
