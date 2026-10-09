# Jira Integration Setup Guide

Complete guide for connecting QUALNEX to Jira Cloud or Jira Server/Data Center.

---

## 🎯 Overview

QUALNEX automatically delivers validated bugs to your Jira projects as issues. This guide covers:

- ✅ Jira Cloud setup (recommended)
- ✅ Jira Server / Data Center setup
- ✅ Required permissions
- ✅ Configuration steps
- ✅ Testing the connection
- ✅ Troubleshooting common issues

---

## 📋 Prerequisites

### What You Need

1. **Jira Account** (Cloud or Server)
   - Admin access or ability to create API tokens
   - Access to at least one project

2. **QUALNEX Running**
   - Frontend and backend services running
   - User logged in with admin/owner role

3. **Project Key**
   - Know your Jira project key (e.g., `PROJ`, `BUG`, `QA`)

---

## 🚀 Quick Start (5 Minutes)

### For Jira Cloud

1. **Create API Token**
   ```
   https://id.atlassian.com/manage-profile/security/api-tokens
   ```
   - Click "Create API token"
   - Name: `QUALNEX Integration`
   - Copy the token

2. **Get Cloud ID**
   ```
   https://admin.atlassian.com/
   ```
   - Select organization → Settings → Domains
   - Cloud ID is in the URL

3. **Connect in QUALNEX**
   - Go to Settings → Integrations → Jira
   - Enter:
     - Domain: `your-company.atlassian.net`
     - Email: your email
     - API Token: from step 1
     - Project Key: e.g., `PROJ`
   - Click "Test Connection"
   - Click "Save"

**Done!** ✅

---

## 🔧 Detailed Setup

### Option 1: Jira Cloud (Recommended)

#### Step 1: Create API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **"Create API token"**
3. Enter label: `QUALNEX Integration`
4. Click **"Create"**
5. **Copy the token immediately** (you won't see it again)

**Security Note**: Treat this token like a password. Never commit it to git or share it.

#### Step 2: Find Your Cloud ID

**Method 1: From Admin Portal**
1. Go to [Atlassian Admin](https://admin.atlassian.com/)
2. Select your organization
3. Click **"Settings"** in the left sidebar
4. Click **"Domains"**
5. Look at the URL: `https://admin.atlassian.com/g/<CLOUD_ID>/...`
6. Copy the Cloud ID (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

**Method 2: From Jira URL**
- Your Jira URL: `https://your-company.atlassian.net`
- Cloud ID is embedded in your instance

#### Step 3: Connect in QUALNEX

1. Log in to QUALNEX
2. Navigate to **Settings** → **Integrations**
3. Find **Jira** in the list
4. Click **"Connect"**
5. Fill in the form:
   ```
   Jira Domain: your-company.atlassian.net
   Email: your-email@company.com
   API Token: [paste token from Step 1]
   Project Key: PROJ
   ```
6. Click **"Test Connection"**
7. If successful, click **"Save"**

#### Step 4: Verify Connection

1. Check the integration status shows: ✅ **Connected**
2. Go to a project with validated bugs
3. Click **"Deliver to Jira"**
4. Check Jira for the new issue

---

### Option 2: Jira Server / Data Center

#### Step 1: Create Personal Access Token

**For Jira Server 8.14+ / Data Center:**

1. Log in to your Jira instance
2. Click your **profile icon** (top right)
3. Click **"Manage Account"**
4. Go to **"Personal Access Tokens"** tab
5. Click **"Create token"**
6. Enter:
   - **Token name**: `QUALNEX Integration`
   - **Expiry**: Choose duration or "Never expire"
7. Click **"Create"**
8. **Copy the token immediately**

**For Older Jira Server Versions:**

If your Jira doesn't support PATs, use Basic Authentication:
- Username: Your Jira username
- Password: Your Jira password
- ⚠️ **Not recommended** - use PAT if available

#### Step 2: Connect in QUALNEX

1. Go to **Settings** → **Integrations** → **Jira**
2. Click **"Connect"**
3. Select **"Jira Server/Data Center"**
4. Fill in:
   ```
   Jira URL: https://jira.your-company.com
   Username: your-username
   API Token: [PAT from Step 1]
   Project Key: PROJ
   ```
5. Click **"Test Connection"**
6. Click **"Save"**

---

## 🔐 Required Jira Permissions

Your Jira user account needs these permissions in the target project:

### Minimum Required

| Permission | Why |
|------------|-----|
| **Browse Projects** | Access the project |
| **Create Issues** | Create bug reports |
| **Add Comments** | Add details to issues |
| **Edit Issues** | Update issue status |

### Recommended

| Permission | Why |
|------------|-----|
| **View Version Control** | Link commits to issues |
| **Attach Attachments** | Upload screenshots/logs |
| **View Readers** | See who's watching |
| **Delete Own Comments** | Clean up if needed |

### How to Check Permissions

1. Go to your Jira project
2. Click **Project settings** (gear icon)
3. Click **Permissions**
4. Check your user's permissions

### Create a Service Account (Recommended)

Instead of using your personal account:

1. Create a dedicated user: `qualnex-bot@your-company.com`
2. Add to a group: `qualnex-integrations`
3. Grant the group required permissions
4. Use this account for QUALNEX integration

**Benefits:**
- ✅ Easier to manage
- ✅ Clear audit trail
- ✅ No issues if employee leaves
- ✅ Can restrict permissions

---

## 🎨 How Issues Are Created

### Issue Format

QUALNEX creates Jira issues with this structure:

```
Title: [QUALNEX] Form validation bypass on /checkout

Description:
h2. Description
The email field on the checkout page does not validate email format properly.

h2. Reproduction Steps
# Navigate to /checkout
# Enter "test@" in email field
# Click "Continue to Payment"
# Observe form submits without error

h2. Expected Result
Form should display validation error for invalid email format

h2. Actual Result
Form accepts "test@" as valid email and proceeds to payment

h2. Technical Context
- Route: /checkout
- Page: Checkout
- Category: Form Validation
- Confidence: High

_Generated by QUALNEX Autonomous QA Engine_

Priority: High
Labels: qualnex, automated-qa, bug
```

### Field Mapping

| QUALNEX Field | Jira Field | Mapping |
|---------------|------------|---------|
| Title | Summary | `[QUALNEX] {title}` |
| Description | Description | Full bug report (ADF format) |
| Severity | Priority | critical→Highest, high→High, medium→Medium, low→Low |
| Category | Labels | `qualnex, automated-qa, {category}` |
| Evidence | Attachments | Screenshots, logs (if supported) |

### Issue Types

By default, QUALNEX creates **Bug** issues. You can customize this in the integration settings.

---

## 🧪 Testing the Connection

### Test from UI

1. Go to **Settings** → **Integrations** → **Jira**
2. Click **"Test Connection"**
3. Expected result: ✅ **Connection successful**

### Test by Creating Issue

1. Run a QA scan on a project
2. Wait for validated bugs
3. Go to **Bugs** page
4. Click **"Deliver to Jira"** on a bug
5. Check Jira for the new issue

### Verify in Jira

1. Open your Jira project
2. Look for issues with label `qualnex`
3. Check the issue format
4. Verify all fields are populated correctly

---

## 🐛 Troubleshooting

### "401 Unauthorized"

**Cause**: API token is incorrect or expired

**Solution**:
1. Regenerate the API token
2. Update in QUALNEX: Settings → Integrations → Jira → Edit
3. Test connection again

### "403 Forbidden"

**Cause**: User doesn't have permission to create issues

**Solution**:
1. Check user has "Create Issues" permission
2. Verify user has access to the project
3. Ask Jira admin to grant permissions

### "Project not found"

**Cause**: Project key is incorrect or user can't access it

**Solution**:
1. Verify project key (case-sensitive)
2. Check user has "Browse Projects" permission
3. Try a different project the user can access

### "Connection timeout"

**Cause**: Jira instance is unreachable

**Solution**:
1. Check Jira URL is correct
2. Verify network connectivity
3. Check firewall settings
4. For Jira Server: verify SSL certificate

### "Rate limit exceeded"

**Cause**: Too many API requests

**Solution**:
- QUALNEX automatically handles rate limits
- Wait a few minutes and retry
- For Jira Cloud: limit is 100 requests/minute

### Issues Not Appearing in Jira

**Check**:
1. Integration is connected (Settings → Integrations)
2. Project key is correct
3. User has "Create Issues" permission
4. Check backend logs: `docker-compose logs worker | grep jira`

### Duplicate Issues

**Should not happen** - QUALNEX uses idempotency keys

**If it does**:
1. Check backend logs for errors
2. Verify database has `external_issue_id` saved
3. Report as bug on GitHub

---

## ⚙️ Advanced Configuration

### Custom Field Mapping

Edit `backend/app/integrations/jira.py`:

```python
# Customize priority mapping
severity_to_priority = {
    "critical": "Highest",
    "high": "High",
    "medium": "Medium",
    "low": "Low",
}

# Add custom fields
custom_fields = {
    "customfield_10001": "QA Automated",  # Example
    "customfield_10002": qa_case.route,   # Dynamic value
}

# Change issue type
issue_type = "Bug"  # or "Task", "Story", etc.
```

### Webhook Integration (Bidirectional Sync)

QUALNEX can receive webhooks from Jira to sync issue status.

**Setup**:

1. In QUALNEX: Settings → Integrations → Jira → Copy webhook URL
2. In Jira:
   - Go to **Project settings** → **Webhooks**
   - Click **Create webhook**
   - Name: `QUALNEX Sync`
   - URL: [paste from QUALNEX]
   - Events: Issue updated, Issue deleted
3. Save

**Benefits**:
- ✅ See Jira status in QUALNEX
- ✅ Track when issues are resolved
- ✅ Sync comments bidirectionally

### Custom Labels

By default, QUALNEX adds labels: `qualnex, automated-qa`

To customize, edit the integration config:

```python
default_labels = ["qualnex", "automated-qa", "bug"]
project_labels = {
    "PROJ": ["proj-specific"],
    "BUG": ["bug-tracker"],
}
```

### Attachment Upload

QUALNEX can upload screenshots and logs as attachments.

**Requirements**:
- Jira user needs "Create Attachment" permission
- Files must be under Jira's size limit (typically 10MB)

**Enable**:
```python
upload_attachments = True
attachment_types = ["screenshot", "video", "log"]
```

---

## 🔒 Security

### Credential Storage

- ✅ API tokens encrypted at rest (Fernet encryption)
- ✅ Tokens never exposed to frontend
- ✅ Stored in database `integrations.credentials` column
- ✅ Only accessible by backend service

### API Security

- ✅ All API calls use HTTPS
- ✅ Tokens sent in Authorization header
- ✅ No tokens in URLs or logs
- ✅ Audit logging for all actions

### Access Control

- ✅ Only organization admins can configure integrations
- ✅ RBAC enforcement on all endpoints
- ✅ Tenant isolation (can't access other org's integrations)

### Best Practices

1. **Use service accounts** - Not personal accounts
2. **Rotate tokens regularly** - Every 90 days
3. **Limit permissions** - Only grant what's needed
4. **Monitor usage** - Check audit logs
5. **Use HTTPS only** - Never HTTP

---

## 📊 Rate Limits

### Jira Cloud

- **Global limit**: 100 requests per minute
- **Per-user limit**: Varies by plan
- **Burst limit**: 150 requests

### Jira Server / Data Center

- **Configurable**: Typically 100-500 requests/minute
- **Check with admin**: `admin/jira/System.jsp`

### How QUALNEX Handles Rate Limits

1. **Automatic backoff**: Exponential retry on 429 errors
2. **Request batching**: Combines multiple operations
3. **Caching**: Reduces redundant API calls
4. **Queue management**: Spreads requests over time

### Monitoring

Check rate limit usage:

```bash
# View backend logs
docker-compose logs worker | grep "jira.*rate"

# Check integration status
curl http://localhost:8000/api/v1/integrations/{id}/status
```

---

## 🔄 Migration from Other Tools

### From TestRail

1. Export test cases from TestRail
2. Import to QUALNEX (coming soon)
3. Connect Jira integration
4. QUALNEX will create issues for failed tests

### From Zephyr

1. Export cycles from Zephyr
2. Import to QUALNEX (coming soon)
3. Connect Jira integration
4. Map existing issues

### From Manual Jira Entry

1. Connect QUALNEX to Jira
2. Run QA scans
3. QUALNEX creates issues automatically
4. Stop manual entry

---

## 📚 Resources

### Official Documentation

- **Jira Cloud REST API**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- **Jira Server REST API**: https://developer.atlassian.com/server/jira/platform/rest/
- **API Token Management**: https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/

### QUALNEX Documentation

- **Main README**: `README.md`
- **Setup Guide**: `SETUP_GUIDE.md`
- **Deployment**: `DEPLOYMENT.md`
- **Complete Setup**: `COMPLETE_SETUP.md`

### Support

- **GitHub Issues**: Report bugs or request features
- **GitHub Discussions**: Ask questions
- **Email**: support@qualnex.io

---

## ✅ Checklist

Before going live:

- [ ] Jira API token created
- [ ] Token added to QUALNEX
- [ ] Connection tested successfully
- [ ] User has required permissions
- [ ] Project key is correct
- [ ] Test issue created in Jira
- [ ] Issue format looks correct
- [ ] Labels are applied
- [ ] Priority mapping works
- [ ] Service account created (recommended)
- [ ] Webhook configured (optional)
- [ ] Team notified about automation

---

## 🎉 You're Ready!

Your Jira integration is now configured. QUALNEX will automatically:

1. ✅ Detect bugs during QA runs
2. ✅ Validate and deduplicate findings
3. ✅ Generate standardized QA cases
4. ✅ Create Jira issues with full details
5. ✅ Prevent duplicates (idempotent)
6. ✅ Track delivery status

**Next steps:**
- Run your first QA scan
- Check Jira for new issues
- Configure webhooks for bidirectional sync
- Train your team on the new workflow

---

**Need help?** Check the troubleshooting section or open an issue on GitHub.
