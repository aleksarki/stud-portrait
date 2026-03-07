
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from ..constants import (
    RsvCompetencies as COMP, RsvMotivators as MOT, RsvValues as VAL, RsvCourses as CUR,
    TableResults as RES
)
from ..models import *


# ====== EXCEPTION ====== #

class ResponseError(Exception):
    """ Raised inside @jsonResponse decorator to break the execution to report client error.
    """
    def __init__(self, message: str = "", status: int = 400):
        """ Raised inside @jsonResponse decorator to break the execution to report client error.
        """
        self.message = message
        self.status = status
        super().__init__(message)


# ====== RESPONSES ====== #

def successResponse(data: dict = dict(), status: int = 200) -> JsonResponse:
    """ Take in dict data, unpack it into returned JSON response with success status.
    """
    return JsonResponse({**{"status": "success"}, **data}, status=status)


def errorResponse(message: str = "", status: int = 400) -> JsonResponse:
    """ Return client error JSON response with provided message and status (400 by default).
    """
    return JsonResponse({"status": "error", "message": message}, status=status)


def notFoundResponse(message: str = "") -> JsonResponse:
    """ Return not found JSON response (status 404).
    """
    return JsonResponse({"status": "error", "message": message}, status=404)


def notAllowedResponse() -> JsonResponse:
    """ Return not allowed JSON response (status 405).
    """
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)


def exceptionResponse(message: str = "", status: int = 500) -> JsonResponse:
    """ Return server error JSON response with provided message and status (500) by default.
    """
    return JsonResponse({"status": "exception", "message": message}, status=status)


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


def jsonResponse(func):
    """
    Take in function returning JSON object (dict).
    On success return JsonResponse (status 200).
    On ResponseError return JsonResponse (status 4**).
    On other exceptions return JsonResponse (status 5**).
    """
    @csrf_exempt
    def wrapper(request):
        try:
            return successResponse(func(request))
        except ResponseError as e:
            return errorResponse(e.message, e.status)
        except Exception as e:
            return exceptionResponse(e)
    return wrapper
