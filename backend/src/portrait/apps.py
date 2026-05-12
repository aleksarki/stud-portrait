import threading
import os
from django.apps import AppConfig

from .mlmodel import MlModel

class PortraitConfig(AppConfig):
    name = 'portrait'

    def ready(self):
        # Пропускаем загрузку в процессе reloader'а Django.
        # RUN_MAIN=true выставляется только в основном рабочем процессе.
        if os.environ.get('RUN_MAIN') != 'true':
            return
        self._preload_model_async()

    def _preload_model_async(self):
        def _load():
            print("[app] (i): initiating load of llm in background")
            if MlModel.load():
                print("[app] (i): llm hot and ready")
            else:
                print("[app] (!): llm load failed; it'll load on request")
        threading.Thread(target=_load, daemon=True).start()
