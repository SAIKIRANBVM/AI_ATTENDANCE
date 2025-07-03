from pydantic import BaseModel

class Recommendation(BaseModel):
    recommendation: str