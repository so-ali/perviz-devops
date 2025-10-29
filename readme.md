# Screenshot & Verification Guide

This guide shows you exactly what to capture for documentation and review.

---

### 1. Initial Setup Verification

**Command:**

```bash
docker-compose ps
```

**What to capture:**

- All four containers showing "Up" status
- Container names, state, and ports
- Health status indicators

**Expected output:**

```
NAME                    STATUS          PORTS
fullstack-backend       Up (healthy)    0.0.0.0:4000->4000/tcp
fullstack-frontend      Up              0.0.0.0:3000->3000/tcp
fullstack-nginx         Up              0.0.0.0:80->80/tcp
fullstack-redis         Up (healthy)    0.0.0.0:6379->6379/tcp
```

---

### 2. Application Homepage

**Access:** http://localhost

---

### 3. API Response

**Command:**

```bash
curl -i http://localhost/api/users
```

**What to capture:**

- HTTP status 200 OK
- Response headers including:
  - Content-Type: application/json
  - X-Cache-Status header
- JSON response body with user data

**Expected response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-Cache-Status: MISS
Content-Length: ...

[
  {
    "id": "1",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-..."
  },
  ...
]
```

---

### 4. Cache Performance Test

**Commands:**

```bash
# First request (cache MISS)
time curl -s http://localhost/api/users -o /dev/null

# Wait 1 second
sleep 1

# Second request (cache HIT)
time curl -s http://localhost/api/users -o /dev/null
```

**What to capture:**

- Execution time for both requests
- Second request should be significantly faster
- Screenshot showing the timing difference

**Expected output:**

```bash
# First request
real    0m1.023s   # Slow (database + caching)
user    0m0.008s
sys     0m0.004s

# Second request
real    0m0.015s   # Fast (from cache)
user    0m0.007s
sys     0m0.005s
```

---

### 5. Cache Headers Verification

**Command:**

```bash
curl -I http://localhost/api/users
```

**What to capture (First request):**

```http
HTTP/1.1 200 OK
X-Cache-Status: MISS
Cache-Control: ...
```

**What to capture (Second request):**

```http
HTTP/1.1 200 OK
X-Cache-Status: HIT
Cache-Control: ...
```

---

### 6. Redis Keys Inspection

**Command:**

```bash
docker-compose exec redis redis-cli KEYS '*'
```

**What to capture:**

- List of cached keys
- Should show: `users:all` and potentially `user:1`, `user:2`, etc.

**Expected output:**

```
1) "users:all"
2) "user:1"
3) "user:2"
```

---

### 7. Cache Invalidation Test

**Commands:**

```bash
# 1. Check current cache
docker-compose exec redis redis-cli KEYS 'users:*'

# 2. Add new user
curl -X POST http://localhost/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'

# 3. Check cache again
docker-compose exec redis redis-cli KEYS 'users:*'
```

**What to capture:**

- Cache keys before adding user
- POST request response (new user created)
- Cache keys after (should be fewer or different)
- This demonstrates cache invalidation working

---

### 8. Nginx Logs

**Command:**

```bash
docker-compose logs nginx --tail=20
```

**What to capture:**

- Access logs showing incoming requests
- Cache status indicators
- Upstream connections to backend/frontend

**Expected log entries:**

```
nginx_1    | 172.25.0.1 - - [29/Oct/2024:10:15:23] "GET /api/users HTTP/1.1" 200
nginx_1    | X-Cache-Status: HIT
```

---

### 9. Backend Logs with Cache Messages

**Command:**

```bash
docker-compose logs backend --tail=30
```

**What to capture:**

- "Fetching users from database and caching" message
- "Returning cached users" message
- "Invalidating users cache" message

**Expected output:**

```
backend_1  | Fetching users from database and caching
backend_1  | Returning cached users
backend_1  | Invalidating users cache
```

---

### 10. Container Resource Usage

**Command:**

```bash
docker stats --no-stream
```

**What to capture:**

- CPU and Memory usage for all containers
- Network I/O statistics
- Demonstrates resource efficiency

**Expected output:**

```
CONTAINER               CPU %    MEM USAGE / LIMIT     NET I/O
fullstack-backend       2.45%    85.5MiB / 512MiB      1.2MB / 856kB
fullstack-frontend      0.85%    120MiB / 512MiB       2.1MB / 1.5MB
fullstack-nginx         0.12%    8.5MiB / 256MiB       3.2MB / 2.8MB
fullstack-redis         0.08%    4.2MiB / unlimited    156kB / 98kB
```

---

### 11. GitHub Actions Workflow

**Location:** GitHub repository → Actions tab

**What to capture:**

- Successful workflow run
- Green checkmarks for all jobs
- Job details showing:
  - test-backend ✓
  - test-frontend ✓
  - build-and-deploy ✓

---

### 12. Cloudflare Protection Simulation

#### DNS Setup

**Cloudflare DNS Configuration:**

```
Type    Name            Content              Proxy Status   TTL
A       @               <YOUR_SERVER_IP>     Proxied        Auto
A       www             <YOUR_SERVER_IP>     Proxied        Auto
CNAME   api             @                    Proxied        Auto
```

#### Caching Configuration

**Page Rules (in order of priority):**

1. **API Endpoints - Bypass Cache**

   - URL: `*example.com/api/*`
   - Settings:
     - Cache Level: Bypass
     - Security Level: High

2. **Static Assets - Aggressive Caching**

   - URL: `*example.com/*.(css|js|jpg|png|gif|svg|woff|woff2)`
   - Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 month
     - Browser Cache TTL: 4 hours

3. **Homepage - Standard Caching**
   - URL: `example.com/`
   - Settings:
     - Cache Level: Standard
     - Browser Cache TTL: 2 hours

#### Rate Limiting Rules

**Rule 1: API Protection**

```yaml
Name: API Rate Limit
Expression: (http.request.uri.path contains "/api/")
Characteristics:
  - When incoming requests match: 100 requests per 1 minute
  - Then take action: Block
  - Duration: 10 minutes
  - Response: Custom HTML with 429 status
```

**Rule 2: Login Protection**

```yaml
Name: Login Rate Limit
Expression: (http.request.uri.path eq "/api/auth/login" and http.request.method eq "POST")
Characteristics:
  - When incoming requests match: 5 requests per 5 minutes
  - Then take action: Challenge (CAPTCHA)
  - Duration: 15 minutes
```

#### Firewall Rules

**Rule 1: Block Known Bad Bots**

```
Expression: (cf.client.bot) and not (cf.verified_bot_category in {"Search Engine Crawler" "Monitoring & Analytics"})
Action: Block
```

**Rule 2: Geographic Restrictions (if needed)**

```
Expression: (ip.geoip.country in {"XX" "YY" "ZZ"})
Action: Challenge
```

**Rule 3: Security Level by Path**

```
Expression: (http.request.uri.path contains "/admin")
Action: Managed Challenge
```

**Rule 4: DDoS Protection**

```
Expression: (http.request.uri.path eq "/" and rate(5m) > 100)
Action: Block
```

#### Security Settings

**Recommended Cloudflare Settings:**

1. **SSL/TLS:** Full (Strict)
2. **Always Use HTTPS:** On
3. **Minimum TLS Version:** 1.2
4. **Automatic HTTPS Rewrites:** On
5. **Security Level:** Medium
6. **Challenge Passage:** 30 minutes
7. **Browser Integrity Check:** On
8. **Hotlink Protection:** On
9. **Bot Fight Mode:** On (Free) or Bot Management (Paid)
