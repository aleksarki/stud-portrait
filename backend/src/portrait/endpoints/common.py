
from docx.document import Document as DocumentObject
from functools import wraps
import hashlib
from io import BytesIO
import json
import pandas as pd
from typing import Any

from django.core.cache import cache
from django.http import JsonResponse, HttpResponse
from django.views.decorators.cache import cache_page
from django.views.decorators.csrf import csrf_exempt

from ..constants import (
    RsvCompetencies as COMP, RsvMotivators as MOT, RsvValues as VAL, RsvCourses as CUR,
    TableCompetenceCenters as TCENTER, TableEducationLevels as TLEVEL,
    TableInstitutions as TINST, TableParticipants as TPART, TableResults as TRES,
    TableSpecialties as TSPEC, TableStudyForms as TFORM,
    CENTERS_REGIONS
)
from ..models import *


DELETE = "DELETE"
GET = "GET"
PATCH = "PATCH"
POST = "POST"


DEBUG = True

def debugPrint(*messages):
    if DEBUG:
        print(*messages)


# ! ===================================================== ORM ====================================================== ! #

IN = 'in'
GTE = 'gte'  # greater than or equal
LTE = 'lte'  # less than or equal
ISNULL = 'isnull'


def join(*options):
    """ Provided joined options for Django ORM.
    """
    return '__'.join(options)
J = join


def isIn(field, option):
    return {f'{field}__{IN}': option}


def isNull(field, option):
    return {f'{field}__{ISNULL}': option}


def greaterEqual(field, option):
    return {f'{field}__{GTE}': option}


def lessEqual(field, option):
    return {f'{field}__{LTE}': option}


def desc(field):
    return f'-{field}'


# ! =================================================== GETTERS ==================================================== ! #

def zeroIfNull(value: Any | None) -> float:
    """ Get float if value is not None; else zero.
    """
    return float(value) if value is not None else 0

def attrIfObj(obj: Any | None, attr: str) -> Any | None:
    """ Get attribute of an object if it is not None; else None.
    """
    return getattr(obj, attr) if obj is not None else None

def attrElseNone(obj: Any, attr: str) -> Any | None:
    """ Get attribute if the object has it; else None.
    """
    return getattr(obj, attr) if hasattr(obj, attr) else None


# ! ================================================== EXCEPTIONS ================================================== ! #

class ResponseError(Exception):
    """ Raised inside @jsonResponse or @httpResponse decorators to break the execution to report client error.
    """
    def __init__(self, message: str = "", status: int = 400):
        """ Raised inside @jsonResponse or @httpResponse decorators to break the execution to report client error.
        """
        self.message = message
        self.status = status
        super().__init__(message)


# ! ================================================== RESPONSES =================================================== ! #

def successResponse(data: dict = dict(), status: int = 200) -> JsonResponse:
    """ Take in dict data, unpack it into returned JSON response with success status.
    """
    try:
        debugPrint(f"success {status}:", json.dumps(data, indent=4, ensure_ascii=False))  # there may be error like decimal
    except:                                                                               # not being json-serialisable
        pass
    return JsonResponse({"status": "success", **data}, status=status)

def xlsxResponse(data: list, sheetname: str, filename: str = "file.xlsx", status: int = 200) -> HttpResponse:
    """ Return HTTP response carrying an Excel file.
    """
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', status=status)
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    df = pd.DataFrame(data)
    with pd.ExcelWriter(response, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name=sheetname)
    debugPrint(f"success {status}:", filename)
    return response

def docxResponse(doc: DocumentObject, filename: str = "file.xlsx", status: int = 200):
    """ Return HTTP response carrying a Word file.
    """
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    response = HttpResponse(
        buffer.getvalue(), status=status,
        content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

def errorResponse(message: str = "", status: int = 400) -> JsonResponse:
    """ Return client error JSON response with provided message and status (400 by default).
    """
    debugPrint(f"error {status}:", message)
    return JsonResponse({"status": "error", "message": message}, status=status)

def notFoundResponse(message: str = "") -> JsonResponse:
    """ Return not found JSON response (status 404).
    """
    debugPrint(f"error {404}:", message)
    return JsonResponse({"status": "error", "message": message}, status=404)

def notAllowedResponse() -> JsonResponse:
    """ Return not allowed JSON response (status 405).
    """
    debugPrint(f"error {405}")
    return JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)

def exceptionResponse(message: str = "", status: int = 500) -> JsonResponse:
    """ Return server error JSON response with provided message and status (500) by default.
    """
    debugPrint(f"error {status}:", message)
    return JsonResponse({"status": "exception", "message": message}, status=status)


# ! ================================================== DECORATORS ================================================== ! #

def method(method):
    """ Automatically reject requests of wrong methods.
    """
    def inner(func):
        @wraps(func)
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
    @wraps(func)
    @csrf_exempt
    def wrapper(request):
        try:
            return successResponse(func(request))
        except ResponseError as e:
            # print(e.message)
            return errorResponse(e.message, e.status)
        except Exception as e:
            # print(str(e))
            # raise
            return exceptionResponse(str(e))
    return wrapper


def httpResponse(func):
    """
    Take in function returning HTTP response object (HttpResponse).
    On success return said HttpResponse (status 200).
    On ResponseError return JsonResponse (status 4**).
    On other exceptions return JsonResponse (status 5**).
    """
    @wraps(func)
    @csrf_exempt
    def wrapper(request):
        try:
            return func(request)
        except ResponseError as e:
            # print(e.message)
            return errorResponse(e.message, e.status)
        except Exception as e:
            # print(str(e))
            raise
            return exceptionResponse(str(e))
    return wrapper


def cached(timeout=3600, prefix='api'):
    """ Automatically cache GET and POST methods given their parameters.
    """
    def inner(func):
        @wraps(func)
        @csrf_exempt
        def wrapper(request):
            match request.method:
                case 'GET':
                    params = request.GET.dict()
                    cache_data = {
                        'path':   request.path,
                        'method': request.method,
                        'params': params
                    }
                case 'POST':
                    body = json.loads(request.body) if request.body else {}
                    cache_data = {
                        'path':   request.path,
                        'method': request.method,
                        'body':   body
                    }
                case _:
                    raise ValueError("Invalid method for caching")

            cache_str = json.dumps(cache_data, sort_keys=True)
            cache_key = f"{prefix}:{hashlib.md5(cache_str.encode()).hexdigest()}"

            try:
                cached_response = cache.get(cache_key)
                if cached_response is not None:
                    debugPrint("[cache] (i): hit", cache_key)
                    return cached_response

                debugPrint("[cache] (!): miss", cache_key)
                response = func(request)
                if response.status_code == 200:
                    cache.set(cache_key, response, timeout=timeout)
                return response
            
            except Exception as e:
                debugPrint("[cache] (!): unavailable", cache_key)
                return func(request)

        return wrapper
    return inner
