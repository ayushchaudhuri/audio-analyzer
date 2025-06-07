# Deployment Guide

## Prerequisites
- Node.js 16+ for frontend
- Python 3.8+ for backend
- pip for Python package management
- A server or cloud platform for hosting (e.g., Vercel, Heroku, DigitalOcean)

## Frontend Deployment

1. Create environment files in the `frontend` directory:

`.env.production`:
```
VITE_API_URL=https://your-backend-url.com
```

2. Build the frontend:
```bash
cd frontend
npm install
npm run build
```

The build output will be in the `dist` directory.

3. Deploy the frontend:
- For Vercel: Push to GitHub and connect to Vercel
- For Netlify: Push to GitHub and connect to Netlify
- For manual deployment: Upload the `dist` directory to your web server

## Backend Deployment

1. Install production dependencies:
```bash
cd backend
pip install -r requirements.txt
pip install gunicorn  # Production server
```

2. Set environment variables on your server:
```bash
export PRODUCTION=true
```

3. Run the backend with gunicorn:
```bash
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Deployment Options

### Option 1: Vercel + Railway
1. Frontend: Deploy to Vercel
2. Backend: Deploy to Railway
3. Set up environment variables in both platforms

### Option 2: DigitalOcean App Platform
1. Create a new app
2. Add both frontend and backend components
3. Configure environment variables

### Option 3: Manual VPS Deployment
1. Set up a VPS (e.g., DigitalOcean Droplet)
2. Install Nginx as reverse proxy
3. Set up SSL with Let's Encrypt
4. Configure domains and DNS

## Security Considerations

1. Update CORS settings in `backend/main.py` with your actual domain
2. Set up proper SSL certificates
3. Configure rate limiting
4. Set up monitoring and logging

## Environment Variables

### Frontend
- `VITE_API_URL`: Backend API URL

### Backend
- `PRODUCTION`: Set to "true" in production
- `PORT`: Optional port number (default: 8000)

## Post-Deployment Checklist

1. Verify CORS is working
2. Test file upload limits
3. Check SSL certificates
4. Monitor error logs
5. Set up backup strategy
6. Configure monitoring alerts

## Scaling Considerations

1. Use CDN for frontend assets
2. Configure proper caching
3. Monitor server resources
4. Set up load balancing if needed
5. Implement proper error handling and retry logic 