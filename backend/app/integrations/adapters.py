"""
Integration Adapters - Universal QA Case → Vendor Adapter Pattern
"""
import json
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from abc import ABC, abstractmethod

import httpx
from app.config import settings

logger = logging.getLogger(__name__)

@dataclass
class ExternalIssue:
    """Represents an issue created in an external system"""
    issue_id: str
    issue_url: str
    vendor: str
    success: bool
    error: Optional[str] = None

class BaseIntegration(ABC):
    """Base class for all integration adapters"""
    
    def __init__(self, credentials: Dict[str, str], config: Dict[str, Any]):
        self.credentials = credentials
        self.config = config
    
    @abstractmethod
    async def test_connection(self) -> bool:
        """Test if the integration credentials are valid"""
        pass
    
    @abstractmethod
    async def create_issue(self, qa_case: Dict[str, Any]) -> ExternalIssue:
        """Create an issue from a QA case"""
        pass
    
    @abstractmethod
    async def get_projects(self) -> List[Dict[str, str]]:
        """List available projects/workspaces"""
        pass
    
    async def find_duplicate(self, qa_case: Dict[str, Any]) -> Optional[str]:
        """Check if a similar issue already exists (idempotency)"""
        return None


class JiraIntegration(BaseIntegration):
    """Atlassian Jira Cloud/Server integration"""
    
    def __init__(self, credentials: Dict[str, str], config: Dict[str, Any]):
        super().__init__(credentials, config)
        self.base_url = config.get("base_url", "https://api.atlassian.com")
        self.cloud_id = config.get("cloud_id", "")
        self.project_key = config.get("project_key", "")
    
    async def test_connection(self) -> bool:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/ex/jira/{self.cloud_id}/rest/api/3/myself",
                    headers=self._auth_headers(),
                    timeout=10
                )
                return response.status_code == 200
            except Exception as e:
                logger.error(f"Jira connection test failed: {e}")
                return False
    
    async def create_issue(self, qa_case: Dict[str, Any]) -> ExternalIssue:
        """Create a Jira issue from a QA case"""
        # Idempotency check
        existing = await self.find_duplicate(qa_case)
        if existing:
            return ExternalIssue(
                issue_id=existing,
                issue_url=f"{self.base_url}/browse/{existing}",
                vendor="jira",
                success=True
            )
        
        severity_map = {
            "critical": "Highest",
            "high": "High",
            "medium": "Medium",
            "low": "Low",
        }
        
        issue_data = {
            "fields": {
                "project": {"key": self.project_key},
                "summary": f"[QUALNEX] {qa_case['title']}",
                "description": self._format_description(qa_case),
                "issuetype": {"name": "Bug"},
                "priority": {"name": severity_map.get(qa_case.get("severity", "medium"), "Medium")},
                "labels": ["qualnex", "automated-qa"],
            }
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/ex/jira/{self.cloud_id}/rest/api/3/issue",
                    headers=self._auth_headers(),
                    json=issue_data,
                    timeout=30
                )
                
                if response.status_code == 201:
                    data = response.json()
                    return ExternalIssue(
                        issue_id=data["key"],
                        issue_url=f"{self.base_url}/browse/{data['key']}",
                        vendor="jira",
                        success=True
                    )
                else:
                    return ExternalIssue(
                        issue_id="",
                        issue_url="",
                        vendor="jira",
                        success=False,
                        error=f"Jira API error: {response.status_code} {response.text}"
                    )
            except Exception as e:
                return ExternalIssue(
                    issue_id="",
                    issue_url="",
                    vendor="jira",
                    success=False,
                    error=str(e)
                )
    
    async def get_projects(self) -> List[Dict[str, str]]:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/ex/jira/{self.cloud_id}/rest/api/3/project",
                    headers=self._auth_headers(),
                    timeout=10
                )
                if response.status_code == 200:
                    return [
                        {"id": p["id"], "name": p["name"], "key": p["key"]}
                        for p in response.json()
                    ]
            except Exception as e:
                logger.error(f"Failed to fetch Jira projects: {e}")
        return []
    
    def _auth_headers(self) -> Dict[str, str]:
        """Generate authentication headers (email + API token for Jira Cloud)"""
        import base64
        email = self.credentials.get("email", "")
        token = self.credentials.get("api_token", "")
        auth = base64.b64encode(f"{email}:{token}".encode()).decode()
        return {
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
    
    def _format_description(self, qa_case: Dict[str, Any]) -> str:
        """Format QA case as Jira ADF description"""
        steps = "\n".join(f"# {step}" for step in qa_case.get("reproduction_steps", []))
        
        return f"""h2. Description
{qa_case.get('title', '')}

h2. Reproduction Steps
{steps}

h2. Expected Result
{qa_case.get('expected_result', 'N/A')}

h2. Actual Result
{qa_case.get('actual_result', 'N/A')}

h2. Technical Context
- Route: {qa_case.get('route', 'N/A')}
- Page: {qa_case.get('page', 'N/A')}
- Category: {qa_case.get('category', 'N/A')}
- Confidence: {qa_case.get('confidence', 'N/A')}

_Generated by QUALNEX Autonomous QA Engine_"""


class GitHubIssuesIntegration(BaseIntegration):
    """GitHub Issues integration"""
    
    def __init__(self, credentials: Dict[str, str], config: Dict[str, Any]):
        super().__init__(credentials, config)
        self.owner = config.get("owner", "")
        self.repo = config.get("repo", "")
    
    async def test_connection(self) -> bool:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"https://api.github.com/repos/{self.owner}/{self.repo}",
                    headers=self._auth_headers(),
                    timeout=10
                )
                return response.status_code == 200
            except Exception:
                return False
    
    async def create_issue(self, qa_case: Dict[str, Any]) -> ExternalIssue:
        # Idempotency check
        existing = await self.find_duplicate(qa_case)
        if existing:
            return ExternalIssue(
                issue_id=existing,
                issue_url=f"https://github.com/{self.owner}/{self.repo}/issues/{existing}",
                vendor="github",
                success=True
            )
        
        body = self._format_body(qa_case)
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"https://api.github.com/repos/{self.owner}/{self.repo}/issues",
                    headers=self._auth_headers(),
                    json={
                        "title": f"[QUALNEX] {qa_case['title']}",
                        "body": body,
                        "labels": ["qualnex", "bug"],
                    },
                    timeout=30
                )
                
                if response.status_code == 201:
                    data = response.json()
                    return ExternalIssue(
                        issue_id=str(data["number"]),
                        issue_url=data["html_url"],
                        vendor="github",
                        success=True
                    )
                else:
                    return ExternalIssue(
                        issue_id="",
                        issue_url="",
                        vendor="github",
                        success=False,
                        error=f"GitHub API error: {response.status_code}"
                    )
            except Exception as e:
                return ExternalIssue(
                    issue_id="",
                    issue_url="",
                    vendor="github",
                    success=False,
                    error=str(e)
                )
    
    async def get_projects(self) -> List[Dict[str, str]]:
        return [{"id": f"{self.owner}/{self.repo}", "name": f"{self.owner}/{self.repo}"}]
    
    def _auth_headers(self) -> Dict[str, str]:
        token = self.credentials.get("token", "")
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json",
        }
    
    def _format_body(self, qa_case: Dict[str, Any]) -> str:
        steps = "\n".join(f"{i+1}. {step}" for i, step in enumerate(qa_case.get("reproduction_steps", [])))
        return f"""## Description
{qa_case.get('title', '')}

## Reproduction Steps
{steps}

## Expected Result
{qa_case.get('expected_result', 'N/A')}

## Actual Result
{qa_case.get('actual_result', 'N/A')}

## Context
- **Route:** `{qa_case.get('route', 'N/A')}`
- **Page:** {qa_case.get('page', 'N/A')}
- **Category:** {qa_case.get('category', 'N/A')}
- **Severity:** {qa_case.get('severity', 'N/A')}
- **Confidence:** {qa_case.get('confidence', 'N/A')}

---
*Generated by [QUALNEX](https://qualnex.io) Autonomous QA Engine*"""


class LinearIntegration(BaseIntegration):
    """Linear integration via GraphQL API"""
    
    def __init__(self, credentials: Dict[str, str], config: Dict[str, Any]):
        super().__init__(credentials, config)
        self.team_id = config.get("team_id", "")
    
    async def test_connection(self) -> bool:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    settings.linear_api_base,
                    headers=self._auth_headers(),
                    json={"query": "{ viewer { id } }"},
                    timeout=10
                )
                return response.status_code == 200 and "data" in response.json()
            except Exception:
                return False
    
    async def create_issue(self, qa_case: Dict[str, Any]) -> ExternalIssue:
        priority_map = {"P0": 1, "P1": 2, "P2": 3, "P3": 4}
        
        mutation = """
        mutation CreateIssue($input: IssueCreateInput!) {
            issueCreate(input: $input) {
                success
                issue {
                    id
                    identifier
                    url
                }
            }
        }
        """
        
        steps = "\\n".join(f"- {step}" for step in qa_case.get("reproduction_steps", []))
        description = f"""**Description:** {qa_case.get('title', '')}

**Reproduction Steps:**
{steps}

**Expected:** {qa_case.get('expected_result', 'N/A')}

**Actual:** {qa_case.get('actual_result', 'N/A')}

*Generated by QUALNEX*"""
        
        variables = {
            "input": {
                "teamId": self.team_id,
                "title": f"[QUALNEX] {qa_case['title']}",
                "description": description,
                "priority": priority_map.get(qa_case.get("priority", "P2"), 3),
            }
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    settings.linear_api_base,
                    headers=self._auth_headers(),
                    json={"query": mutation, "variables": variables},
                    timeout=30
                )
                
                data = response.json()
                if data.get("data", {}).get("issueCreate", {}).get("success"):
                    issue = data["data"]["issueCreate"]["issue"]
                    return ExternalIssue(
                        issue_id=issue["identifier"],
                        issue_url=issue["url"],
                        vendor="linear",
                        success=True
                    )
                else:
                    return ExternalIssue(
                        issue_id="",
                        issue_url="",
                        vendor="linear",
                        success=False,
                        error="Linear mutation failed"
                    )
            except Exception as e:
                return ExternalIssue(
                    issue_id="",
                    issue_url="",
                    vendor="linear",
                    success=False,
                    error=str(e)
                )
    
    async def get_projects(self) -> List[Dict[str, str]]:
        query = "{ teams { nodes { id name } } }"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    settings.linear_api_base,
                    headers=self._auth_headers(),
                    json={"query": query},
                    timeout=10
                )
                data = response.json()
                return [
                    {"id": t["id"], "name": t["name"]}
                    for t in data.get("data", {}).get("teams", {}).get("nodes", [])
                ]
            except Exception:
                return []
    
    def _auth_headers(self) -> Dict[str, str]:
        token = self.credentials.get("api_key", "")
        return {
            "Authorization": token,
            "Content-Type": "application/json",
        }


class IntegrationRouter:
    """
    Routes QA cases to the appropriate integration adapter.
    Handles idempotency, retries, and audit logging.
    """
    
    VENDORS = {
        "jira": JiraIntegration,
        "github": GitHubIssuesIntegration,
        "linear": LinearIntegration,
    }
    
    def __init__(self):
        self.adapters: Dict[str, BaseIntegration] = {}
    
    def register(self, vendor: str, credentials: Dict, config: Dict):
        """Register an integration adapter"""
        adapter_class = self.VENDORS.get(vendor)
        if adapter_class:
            self.adapters[vendor] = adapter_class(credentials, config)
    
    async def deliver(self, vendor: str, qa_case: Dict[str, Any]) -> ExternalIssue:
        """Deliver a QA case to an external system"""
        adapter = self.adapters.get(vendor)
        if not adapter:
            return ExternalIssue(
                issue_id="",
                issue_url="",
                vendor=vendor,
                success=False,
                error=f"Integration '{vendor}' not configured"
            )
        
        # Retry with exponential backoff
        for attempt in range(3):
            result = await adapter.create_issue(qa_case)
            if result.success:
                return result
            
            if attempt < 2:
                import asyncio
                await asyncio.sleep(2 ** attempt)
                logger.warning(f"Retry {attempt + 1} for {vendor} delivery")
        
        return result
