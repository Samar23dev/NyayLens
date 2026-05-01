from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class Language(BaseModel):
    code: str
    name: str
    nativeName: str

class ShapToken(BaseModel):
    word: str
    score: float

class Regulation(BaseModel):
    id: str
    code: str
    title: str
    section: str
    body: Literal['BNS', 'SEBI', 'RBI', 'Companies Act', 'IT Act', 'Indian Contract Act', 'Arbitration Act', 'Consumer Protection Act', 'Specific Relief Act', 'Limitation Act']
    relevance: float

class Precedent(BaseModel):
    id: str
    title: str
    court: str
    year: int
    summary: str
    relevanceScore: float

class Clause(BaseModel):
    id: str
    index: int
    title: str
    text: str
    translatedText: Optional[str] = None
    riskLevel: Literal['high', 'medium', 'low', 'safe']
    riskScore: int
    category: str
    shapTokens: List[ShapToken] = []
    rewrite: Optional[str] = None
    regulations: List[Regulation] = []
    conflicts: Optional[List[str]] = None
    retrievedPrecedents: List[Precedent] = []

class ConflictPair(BaseModel):
    clauseAId: str
    clauseBId: str
    clauseATitle: str
    clauseBTitle: str
    description: str
    severity: Literal['critical', 'warning', 'info']

class RiskBreakdown(BaseModel):
    high: int
    medium: int
    low: int
    safe: int

class AnalysisResult(BaseModel):
    documentId: str
    fileName: str
    language: Language
    uploadedAt: str
    processingTime: float
    overallRiskScore: int
    clauses: List[Clause]
    conflicts: List[ConflictPair]
    summary: str
    riskBreakdown: RiskBreakdown
    version: int = 1
    parentDocumentId: Optional[str] = None
    rewritesApplied: int = 0
