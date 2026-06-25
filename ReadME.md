# Pigeon — Document Upload & Sharing API

Node.js + Express + MongoDB Atlas + AWS S3  
Deploy target: AWS EC2 (Ubuntu 22.04)

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Get JWT token |
| GET | /api/auth/me | Yes | Your profile |
| POST | /api/docs/upload | Yes | Upload a file |
| GET | /api/docs | Yes | List your docs |
| GET | /api/docs/shared | Yes | Docs shared with you |
| GET | /api/docs/:id/download | Yes | Get presigned download URL |
| GET | /api/docs/public/:token | No | Download via public link |
| POST | /api/docs/:id/share | Yes | Share with user or make public |
| DELETE | /api/docs/:id | Yes | Delete document |

---

## Step 1 — MongoDB Atlas Setup

1. Go to https://cloud.mongodb.com and create a free cluster
2. Under "Database Access" create a user with readWrite permissions
3. Under "Network Access" add your IP (or 0.0.0.0/0 for dev)
4. Click "Connect" → "Drivers" → copy the connection string
5. Paste it into .env as MONGO_URI (replace <password> with your actual password)

---

## Step 2 — AWS S3 Setup

1. Go to AWS Console → S3 → Create bucket
   - Name: cloudvault-docs (or any unique name)
   - Region: ap-south-1 (Mumbai) or your nearest
   - Block ALL public access: ON (we use presigned URLs, not public objects)

2. Go to IAM → Users → Create user
   - Attach policy: AmazonS3FullAccess (or a custom scoped policy)
   - Create access keys → copy to .env

3. Add a CORS policy to the S3 bucket (Permissions tab):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

---

## Step 3 — Local Development

```bash
# Clone & install
git clone <your-repo-url>
cd cloudvault
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI, AWS keys, S3 bucket name

# Run in dev mode
npm run dev
```

Test the health check:
```
GET http://localhost:5000/health
```

---

## Step 4 — Deploy to EC2

### 4.1 Launch EC2 Instance
- AMI: Ubuntu Server 22.04 LTS
- Instance type: t3.micro (free tier eligible)
- Security group inbound rules:
  - Port 22 (SSH)
  - Port 80 (HTTP)
  - Port 443 (HTTPS — if using SSL)
  - Port 5000 (API — or remove once Nginx is set up)

### 4.2 Connect & Install Node.js

```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>

# Update & install Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager) and Git
sudo npm install -g pm2
sudo apt-get install -y git
```

### 4.3 Deploy the App

```bash
# Clone your repo
git clone <your-repo-url>
cd cloudvault
npm install --production

# Create .env from example and fill in values
cp .env.example .env
nano .env

# Start with PM2
pm2 start src/server.js --name cloudvault
pm2 save
pm2 startup  # follow the command it outputs to auto-start on reboot
```

### 4.4 Set Up Nginx Reverse Proxy

```bash
sudo apt-get install -y nginx

sudo nano /etc/nginx/sites-available/cloudvault
```

Paste this config:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your EC2 public IP

    client_max_body_size 25M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cloudvault /etc/nginx/sites-enabled/
sudo nginx -t       # test config
sudo systemctl reload nginx
```

### 4.5 (Optional) Free SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## Sample Requests (curl)

```bash
BASE=http://localhost:5000

# Register
curl -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}'

# Login — copy the token from the response
curl -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'

TOKEN=<paste token here>

# Upload a file
curl -X POST $BASE/api/docs/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/document.pdf"

DOC_ID=<paste document id here>

# Get download URL
curl $BASE/api/docs/$DOC_ID/download \
  -H "Authorization: Bearer $TOKEN"

# Share with a user
curl -X POST $BASE/api/docs/$DOC_ID/share \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"user","email":"bob@example.com","permission":"download"}'

# Generate a public link
curl -X POST $BASE/api/docs/$DOC_ID/share \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"public"}'

# Delete
curl -X DELETE $BASE/api/docs/$DOC_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Project Structure

```
cloudvault/
├── src/
│   ├── config/
│   │   ├── db.js           MongoDB Atlas connection
│   │   └── s3.js           AWS S3 client
│   ├── controllers/
│   │   ├── authController.js
│   │   └── docController.js
│   ├── middleware/
│   │   ├── auth.js         JWT protect middleware
│   │   ├── upload.js       Multer + S3 storage
│   │   └── errorHandler.js Global error handler
│   ├── models/
│   │   ├── User.js
│   │   └── Document.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── docs.js
│   ├── app.js              Express app (no listen)
│   └── server.js           Entry point (listen)
├── .env.example
├── package.json
└── README.md
```