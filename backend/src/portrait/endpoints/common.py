
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from ..constants import *
from ..models import *

successResponse =    lambda d: JsonResponse({**{"status": "success"}, **d},                       status=200)
errorResponse =      lambda m: JsonResponse({"status": "error", "message": m},                    status=400)
notFoundResponse =   lambda m: JsonResponse({"status": "error", "message": m},                    status=404)
notAllowedResponse = lambda:   JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)
exceptionResponse =  lambda e: JsonResponse({"status": "error", "message": str(e)},               status=500)

class ResponseError(Exception):
    """ Contains error message.
    """
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


# ====== DECORATORS ====== #

def method(method):
    """ Automatically reject requests of wrong methods.
    """
    def inner(func):
        @csrf_exempt
        def wrapper(request):
            if request.method != method:
                return notAllowedResponse()
            return func(request)
        return wrapper
    return inner

def response(func):
    """ 
    Takes JSON object (dict).
    On success returns JsonResponse[200]. On exception returns JsonResponse[400].
    """
    @csrf_exempt
    def wrapper(request):
        try:
            return successResponse(func(request))
        except ResponseError as e:
            return exceptionResponse(e.message)
        except Exception as e:
            return exceptionResponse(e)
    return wrapper
