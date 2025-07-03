from pydantic import BaseModel

class ValueLabelPair(BaseModel):
    value: str
    label: str