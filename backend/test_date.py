import sys
import pydantic
print(pydantic.__version__)
from models import TaskUpdate
try:
    print("Testing TaskUpdate")
    t = TaskUpdate(date="2026-06-12")
    print(t)
except Exception as e:
    import traceback
    traceback.print_exc()
