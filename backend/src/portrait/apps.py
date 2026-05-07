import threading
import os
from django.apps import AppConfig

class PortraitConfig(AppConfig):
    name = 'portrait'

    def ready(self):
        # Пропускаем загрузку в процессе reloader'а Django.
        # RUN_MAIN=true выставляется только в основном рабочем процессе.
        if os.environ.get('RUN_MAIN') != 'true':
            return
        self._preload_model_async()

    def _preload_model_async(self):
        from .ml_model import load_model

        def _load():
            print("🔄 Предзагрузка LLM модели в фоновом потоке...")
            model, tokenizer = load_model()
            if model is not None:
                print("✅ LLM модель предзагружена и готова к использованию.")
            else:
                print("⚠️ Не удалось предзагрузить LLM модель – будет загружаться при первом запросе.")

        thread = threading.Thread(target=_load, daemon=True)
        thread.start()