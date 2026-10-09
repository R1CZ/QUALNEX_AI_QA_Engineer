# DeepSeek AI Integration - Complete

## ✅ What Changed

QUALNEX now uses **DeepSeek** instead of Qwen for AI-powered features. DeepSeek offers:
- ✅ **Very affordable** (~$0.22/1M input tokens, ~$0.28/1M output tokens)
- ✅ **5M free tokens** on signup
- ✅ **OpenAI-compatible API** - Easy to integrate
- ✅ **Two models**: `deepseek-chat` (fast) and `deepseek-reasoner` (complex reasoning)
- ✅ **No vendor lock-in** - Can switch to other OpenAI-compatible providers

---

## 🎯 Why DeepSeek?

### Cost Comparison (per 1M tokens)

| Provider | Input Cost | Output Cost | Free Tier |
|----------|-----------|-------------|-----------|
| **DeepSeek** ⭐ | $0.22 | $0.28 | 5M tokens |
| Qwen | $0.80 | $2.00 | Limited |
| OpenAI GPT-4 | $10.00 | $30.00 | None |
| OpenAI GPT-3.5 | $0.50 | $1.50 | None |
| Anthropic Claude | $3.00 | $15.00 | None |

**DeepSeek is 3-10x cheaper than alternatives!**

### Features

- ✅ **deepseek-chat** (DeepSeek-V3) - Fast, general purpose tasks
- ✅ **deepseek-reasoner** (DeepSeek-R1) - Complex reasoning, validation
- ✅ **128K context window** - Handle large codebases
- ✅ **JSON mode** - Structured outputs
- ✅ **OpenAI-compatible** - Use any OpenAI SDK

---

## 🚀 Setup Instructions

### Step 1: Get DeepSeek API Key

1. Go to **https://platform.deepseek.com/**
2. Sign up (free)
3. Navigate to **API Keys** section
4. Click **"Create new API key"**
5. Copy your API key

**You get 5M free tokens on signup!**

### Step 2: Configure Backend

Edit `backend/.env`:

```env
# ============ AI - DeepSeek ============
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_REASONER_MODEL=deepseek-reasoner
```

### Step 3: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

The `openai` package is now included (DeepSeek uses OpenAI-compatible API).

### Step 4: Test the Integration

```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# The AI agents will automatically use DeepSeek
```

---

## 🤖 How It Works

### AI Agent Architecture

QUALNEX uses specialized AI agents for different tasks:

| Agent | Model | Purpose |
|-------|-------|---------|
| **Discovery Agent** | deepseek-chat | Map application structure |
| **Planning Agent** | deepseek-chat | Create test plans |
| **Browser QA Agent** | deepseek-chat | Analyze test results |
| **Validation Agent** | deepseek-reasoner | Validate bugs (complex reasoning) |
| **Dedup Agent** | deepseek-chat | Find duplicate findings |
| **QA Case Agent** | deepseek-chat | Generate bug reports |

### Model Selection

- **deepseek-chat** (V3): Fast, cost-effective for most tasks
- **deepseek-reasoner** (R1): Used for complex validation tasks that require deeper reasoning

The system automatically selects the appropriate model based on task complexity.

---

## 💰 Cost Estimation

### Typical QA Run

For a medium-sized application (100 tests):

| Task | Tokens Used | Cost |
|------|-------------|------|
| Discovery | ~5K tokens | $0.001 |
| Planning | ~3K tokens | $0.001 |
| Analysis (100 tests) | ~50K tokens | $0.011 |
| Validation (20 findings) | ~20K tokens | $0.006 |
| Deduplication | ~5K tokens | $0.001 |
| QA Case Generation | ~10K tokens | $0.002 |
| **Total** | **~93K tokens** | **~$0.022** |

**Cost per QA run: ~$0.02** (2 cents!)

### Monthly Estimate

For 100 QA runs per day:
- Daily: ~$2.20
- Monthly: ~$66

**With 5M free tokens, you get ~50 QA runs free!**

---

## 🔧 Configuration Options

### Change Models

Edit `backend/app/config.py`:

```python
# Use different models
deepseek_model: str = "deepseek-chat"  # Fast model
deepseek_reasoner_model: str = "deepseek-reasoner"  # Reasoning model

# Adjust parameters
deepseek_max_tokens: int = 4096
deepseek_temperature: float = 0.1  # Lower = more deterministic
```

### Switch to Other OpenAI-Compatible Providers

DeepSeek's API is OpenAI-compatible, so you can easily switch to:

**Option 1: OpenAI**
```env
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_API_BASE=https://api.openai.com/v1
DEEPSEEK_MODEL=gpt-4-turbo
```

**Option 2: Azure OpenAI**
```env
DEEPSEEK_API_KEY=...
DEEPSEEK_API_BASE=https://your-resource.openai.azure.com/
DEEPSEEK_MODEL=gpt-4
```

**Option 3: Local (Ollama)**
```env
DEEPSEEK_API_KEY=ollama
DEEPSEEK_API_BASE=http://localhost:11434/v1
DEEPSEEK_MODEL=deepseek-coder
```

**Option 4: Together AI**
```env
DEEPSEEK_API_KEY=...
DEEPSEEK_API_BASE=https://api.together.xyz/v1
DEEPSEEK_MODEL=deepseek-ai/DeepSeek-V3
```

---

## 🆓 Completely Free Alternative: Ollama

If you want **100% free AI** with no API costs, use **Ollama** to run DeepSeek locally:

### Setup Ollama

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull DeepSeek model
ollama pull deepseek-coder:6.7b

# Start Ollama server
ollama serve
```

### Configure QUALNEX

```env
DEEPSEEK_API_KEY=ollama
DEEPSEEK_API_BASE=http://localhost:11434/v1
DEEPSEEK_MODEL=deepseek-coder:6.7b
DEEPSEEK_REASONER_MODEL=deepseek-coder:6.7b
```

**Benefits:**
- ✅ Completely free
- ✅ No rate limits
- ✅ Full privacy (data stays on your machine)
- ✅ Works offline

**Trade-offs:**
- ❌ Requires decent hardware (8GB+ RAM)
- ❌ Slower than cloud API
- ❌ Smaller model = less accurate

---

## 📊 Monitoring AI Usage

### View Token Usage

The backend logs all AI requests:

```bash
# View logs
docker-compose logs -f worker | grep "DeepSeek"

# Example output:
# DeepSeek deepseek-chat completed: 1234 tokens, 850ms
# DeepSeek deepseek-reasoner completed: 567 tokens, 2100ms
```

### Track Costs

Monitor your usage at:
- **DeepSeek Dashboard**: https://platform.deepseek.com/dashboard
- View token usage, costs, and rate limits

---

## 🔐 Security Considerations

### API Key Security

- ✅ Store in environment variables (never commit to git)
- ✅ Use `.env` files (already in `.gitignore`)
- ✅ Rotate keys periodically
- ✅ Monitor usage for anomalies

### Data Privacy

- ✅ DeepSeek processes data in their cloud
- ✅ For sensitive data, use Ollama (local)
- ✅ No training on your data (DeepSeek policy)
- ✅ API calls are encrypted (HTTPS)

---

## 🐛 Troubleshooting

### "Invalid API key"

**Problem**: API key is incorrect or expired.

**Solution**:
1. Go to https://platform.deepseek.com/
2. Check your API key
3. Regenerate if needed
4. Update `backend/.env`

### "Rate limit exceeded"

**Problem**: Too many requests per minute.

**Solution**:
- DeepSeek has generous rate limits (2500 concurrent requests)
- If you hit limits, add delays in `backend/app/agents/orchestrator.py`
- Or upgrade your plan

### "Model not found"

**Problem**: Model name is incorrect.

**Solution**:
- Use `deepseek-chat` or `deepseek-reasoner`
- Check DeepSeek docs for latest model names

### Slow responses

**Problem**: API is taking too long.

**Solution**:
- Use `deepseek-chat` instead of `deepseek-reasoner` (faster)
- Reduce `max_tokens` in config
- Check your internet connection
- Consider using Ollama for local processing

---

## 📚 API Documentation

### DeepSeek API Docs
- **Official Docs**: https://api-docs.deepseek.com/
- **Pricing**: https://api-docs.deepseek.com/quick_start/pricing
- **Rate Limits**: https://api-docs.deepseek.com/quick_start/rate_limit

### OpenAI-Compatible API

Since DeepSeek uses OpenAI format, you can use:
- **OpenAI Python SDK**: `pip install openai`
- **OpenAI Node.js SDK**: `npm install openai`
- **Any OpenAI-compatible tool**

Example API call:

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-...",
    base_url="https://api.deepseek.com"
)

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "You are a QA engineer"},
        {"role": "user", "content": "Analyze this bug..."}
    ],
    temperature=0.1,
    max_tokens=4096
)

print(response.choices[0].message.content)
```

---

## 🎯 Comparison: DeepSeek vs Other Options

| Feature | DeepSeek | Qwen | OpenAI GPT-4 | Local (Ollama) |
|---------|----------|------|--------------|----------------|
| **Cost** | ~$0.22/1M | ~$0.80/1M | $10/1M | Free |
| **Free Tier** | 5M tokens | Limited | None | Unlimited |
| **Speed** | Fast | Fast | Medium | Slow |
| **Quality** | High | High | Very High | Medium |
| **Privacy** | Cloud | Cloud | Cloud | Local ✅ |
| **Setup** | Easy | Easy | Easy | Medium |
| **Rate Limits** | Generous | Limited | Strict | None |

**Recommendation**: Start with DeepSeek API (cheap + easy), switch to Ollama if you need 100% free or full privacy.

---

## ✅ Checklist

Before going live:

- [ ] DeepSeek API key obtained
- [ ] API key added to `backend/.env`
- [ ] `openai` package installed
- [ ] Tested AI agents locally
- [ ] Monitored token usage
- [ ] Set up cost alerts in DeepSeek dashboard
- [ ] Considered Ollama for sensitive data
- [ ] Documented model selection rationale

---

## 🔄 Migration Path

### If you need to switch providers later:

**To OpenAI:**
```env
DEEPSEEK_API_BASE=https://api.openai.com/v1
DEEPSEEK_MODEL=gpt-4-turbo
```

**To Anthropic:**
- Requires code changes (different API format)
- Update `backend/app/agents/orchestrator.py`

**To Local (Ollama):**
```env
DEEPSEEK_API_KEY=ollama
DEEPSEEK_API_BASE=http://localhost:11434/v1
DEEPSEEK_MODEL=deepseek-coder:6.7b
```

**No code changes needed** for OpenAI-compatible providers!

---

## 📞 Support

- **DeepSeek API Issues**: https://platform.deepseek.com/
- **QUALNEX Integration**: Check backend logs
- **Community**: https://github.com/deepseek-ai

---

## 🎉 Summary

QUALNEX now uses **DeepSeek** for AI-powered features:

✅ **Very affordable** - ~$0.02 per QA run  
✅ **5M free tokens** on signup  
✅ **OpenAI-compatible** - Easy to switch providers  
✅ **Two models** - Fast chat + reasoning  
✅ **Production-ready** - Tested and integrated  

**Next steps:**
1. Get your DeepSeek API key
2. Add to `backend/.env`
3. Test locally
4. Deploy to production

**Need help?** Check the troubleshooting section or view DeepSeek docs at https://api-docs.deepseek.com/
