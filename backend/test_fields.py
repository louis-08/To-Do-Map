from models import TaskUpdate
print(TaskUpdate.model_fields['date'].annotation)
print(TaskUpdate.model_fields['date'].__dict__)
