from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from threading import Thread
import time
import torch
from typing import Optional, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from .mlmodel import MlModel


class GenerationRequest(BaseModel):
    prompt: str
    max_length: int = Field(default=400, ge=1, le=2048)
    temperature: float = Field(default=0.15, ge=0.01, le=2.0)
    top_p: float = Field(default=0.85, ge=0.01, le=1.0)

class GenerationResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    error: Optional[str] = None
    generation_time: Optional[float] = None

class HealthResponse(BaseModel):
    status: str
    model_available: bool
    load_attempted: bool
    device: Optional[str] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """ Manage lifespan.
    """
    logger.info("[llm] (i): starting llm service")

    def load_in_background():
        logger.info("[llm] (i): initiating load of llm in background")
        if MlModel.load():
            logger.info("[llm] (i): model hot and ready")
        else:
            logger.info("[llm] (!): llm load failed; it'll load on request")

    Thread(target=load_in_background, daemon=True).start()

    yield

    logger.info("[llm] (i): shutting down llm service")


app = FastAPI(
    title="LLM Service",
    description="Service for LLM inference (Qwen3-4B)",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """ Check service health and model status.
    """
    return HealthResponse(
        status="healthy",
        model_available=MlModel.AVAILABLE,
        load_attempted=MlModel.LOAD_ATTEMPTED,
        device="cuda" if torch.cuda.is_available() else "cpu"
    )

@app.get("/wait_for_model")
async def wait_for_model(timeout: float = 120.):
    """ Wait for model to load.
    """
    start_time = time.time()
    if MlModel.waitForLoad(timeout=timeout):
        return {
            "success": True,
            "message": "Model is ready",
            "wait_time": time.time() - start_time
        }
    else:
        raise HTTPException(
            status_code=504,
            detail=f"Model loading timeout after {timeout} seconds"
        )

@app.post("/generate", response_model=GenerationResponse)
async def generate(request: GenerationRequest):
    """ Generate response using LLM.
    """
    logger.info("!!!!!")
    if not MlModel.AVAILABLE:
        # wait a bit for the model, if not loaded yet
        logger.info("[llm] (!): model not ready, waiting for load")
        if not MlModel.waitForLoad(timeout=30.0):
            return GenerationResponse(
                success=False,
                error="Model is not available yet. Please try again later."
            )

    try:
        start_time = time.time()
        
        logger.info(f"[model] (i): model got prompt: '{request.prompt}'")
        
        response = MlModel.generate(
            prompt=request.prompt,
            max_length=request.max_length,
            temperature=request.temperature,
            top_p=request.top_p
        )

        generation_time = time.time() - start_time

        if response is not None:
            logger.info(f"[llm] (i): generated response in {generation_time:.2f}s")
            return GenerationResponse(
                success=True,
                response=response,
                generation_time=generation_time
            )
        else:
            return GenerationResponse(
                success=False,
                error="Model returned None",
                generation_time=generation_time
            )

    except Exception as e:
        logger.info(f"[llm] (!): generation failed: {str(e)}")
        return GenerationResponse(
            success=False,
            error=str(e)
        )

@app.post("/compatible_generate")
async def compatible_generate(prompt: str, max_length: int = 400, temperature: float = .15, top_p: float = .85):
    """ Generate response using LLM (old version).
    """
    result = await generate(GenerationRequest(
        prompt=prompt,
        max_length=max_length,
        temperature=temperature,
        top_p=top_p
    ))
    return result

@app.post("/generate_batch")
async def generate_batch(requests: List[GenerationRequest]):
    """ Generate responses for multiple prompts in batch.
    """
    results = []
    for req in requests:
        result = await generate(req)
        results.append(result.dict())
    return {"results": results}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
        workers=1
    )
