from django.apps import AppConfig

class PortraitConfig(AppConfig):
    name = 'portrait'

    def ready(self):
        from .ml_model import load_model
        load_model()
