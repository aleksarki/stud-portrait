from django.urls import path

from . import views

urlpatterns = [
    path("students/", views.participants, name="students"),
    path("results/", views.results, name="results"),
    path('import_excel/', views.import_excel, name="import_excel"),
    path("stats/", views.stats, name="stats")
]
