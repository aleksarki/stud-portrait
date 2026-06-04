import threading
import os
from django.apps import AppConfig

from .llmclient import LLM_CLIENT

class PortraitConfig(AppConfig):
    name = 'portrait'

    def ready(self):
        # Пропускаем загрузку в процессе reloader'а Django.
        # RUN_MAIN=true выставляется только в основном рабочем процессе.
        if os.environ.get('RUN_MAIN') != 'true':
            return
        self._check_llm_service_async()

    def _check_llm_service_async(self):
        def _check():
            print("[app] (i): checking llm service availability")
            health = LLM_CLIENT.health_check()
            if health.get('model_available'):
                print(f"[app] (i): llm service is available, model ready")
            elif health.get('load_attempted'):
                print(f"[app] (i): llm service available, model loading in progress")
            else:
                print(f"[app] (!): llm service not available")
        threading.Thread(target=_check, daemon=True).start()
