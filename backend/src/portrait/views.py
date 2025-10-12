from django.shortcuts import render
from django.http import JsonResponse

# Create your views here.

def students(request):
    # logics
    return JsonResponse({"response": "students"})

def results(request):
    # logics
    return JsonResponse({"response": "results"})
