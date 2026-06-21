import httpx
from typing import Optional, Dict, Any

from django.conf import settings


class LLMServiceClient:
    """ HHTP client for LLM service.
    """
    def __init__(self):
        self.base_url = getattr(settings, 'LLM_SERVICE_URL', 'http://localhost:8001')
        self.timeout = httpx.Timeout(60.0)
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = httpx.Client(timeout=self.timeout)
        return self._client

    def generate(
        self, 
        prompt: str, 
        max_length: int = 400,
        temperature: float = 0.15,
        top_p: float = 0.85
    ) -> Optional[str]:
        """ Send request for text generation.
        """
        print(f"[llm] (i): model got prompt:", repr(prompt))
        try:
            payload = {
                "prompt": prompt,
                "max_length": max_length,
                "temperature": temperature,
                "top_p": top_p
            }

            response = self.client.post(
                f"{self.base_url}/generate",
                json=payload,
                timeout=120
            )
            response.raise_for_status()

            data = response.json()
            if data.get("success"):
                print(f"[llm] (i): model generated text:", repr(data.get("response")))
                return data.get("response")
            else:
                print(f"[llm] (!): model service error: {data.get('error')}")
                return None

        except httpx.HTTPError as e:
            print(f"[llm] (!): http error while calling LLM service: {str(e)}")
            return None
        except Exception as e:
            print(f"[llm] (!): unexpected error: {str(e)}")
            return None

    def health_check(self) -> Dict[str, Any]:
        """ Check for service availability.
        """
        try:
            response = self.client.get(f"{self.base_url}/health")
            if response.status_code == 200:
                return response.json()
            return {"status": "unhealthy"}
        except Exception as e:
            print(f"[llm] (!): health check failed: {str(e)}")
            return {"status": "unavailable", "error": str(e)}

    def wait_for_model(self, timeout: float = 120.0) -> bool:
        """ Wait for model load.
        """
        try:
            response = self.client.get(f"{self.base_url}/wait_for_model", params={"timeout": timeout})
            if response.status_code == 200:
                data = response.json()
                print(f"[llm] (i): model ready after {data.get('wait_time', 0):.2f}s")
                return True
            return False
        except Exception as e:
            print(f"[llm] (!): wait for model failed: {str(e)}")
            return False

    def close(self):
        if self._client:
            self._client.close()
            self._client = None


LLM_CLIENT = LLMServiceClient()
