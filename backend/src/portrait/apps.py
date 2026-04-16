import os
from django.apps import AppConfig

class PortraitConfig(AppConfig):
    name = 'portrait'

    def ready(self):
        try:
            from .ml_model import load_model
            load_model()
        except Exception as e:
            print(f"Warning: Could not preload LLM model on startup: {e}")