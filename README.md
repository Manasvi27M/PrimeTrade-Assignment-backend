# Auralink Backend API

A pure Node.js/Express backend API for the Auralink SaaS application.

## Features

- RESTful API with Express.js
- MongoDB database with Mongoose
- JWT authentication
- Google OAuth integration
- AI insights generation via OpenRouter
- Swagger API documentation
- CORS enabled
- Error handling middleware

## Prerequisites

- Node.js >= 16.0.0
- MongoDB database (local or cloud)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd primetradebackend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/auralink

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# OpenRouter API (for AI insights)
OPENROUTER_API_KEY=your-openrouter-api-key

# Frontend URL (for CORS and API referrer)
FRONTEND_URL=http://localhost:3000
```

4. Update the `.env` file with your actual values.

## Running the Application

### Development Mode
```bash
npm run dev
```
This uses nodemon to automatically restart the server on file changes.

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

## API Endpoints

### Health Check
- `GET /health` - Check if the server is running

### Authentication
- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user profile (requires authentication)
- `PUT /api/auth/profile` - Update user profile (requires authentication)
- `POST /api/auth/logout` - Logout user (requires authentication)

### Entities
- `GET /api/entities` - Get all entities for the authenticated user
- `POST /api/entities` - Create a new entity
- `GET /api/entities/:id` - Get a specific entity
- `PUT /api/entities/:id` - Update an entity
- `DELETE /api/entities/:id` - Delete an entity

### Analytics
- `GET /api/analytics` - Get analytics data for the authenticated user

### Insights
- `GET /api/insights` - Get user's insights
- `POST /api/insights/generate` - Generate AI insight (requires authentication)

## API Documentation

Swagger documentation is available at:
- `http://localhost:5000/api-docs` (when running locally)

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment (development/production) | No | development |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | - |
| `JWT_EXPIRY` | JWT token expiration | No | 7d |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes | - |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI features | Yes | - |
| `FRONTEND_URL` | Frontend URL for CORS | No | http://localhost:3000 |

## Deployment

### Deploying to a VPS/Cloud Server

1. Clone the repository on your server
2. Install Node.js and MongoDB
3. Set up environment variables
4. Install dependencies: `npm install`
5. Start the application: `npm start`

### Using PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start src/server.js --name auralink-backend
pm2 save
pm2 startup
```

### Using Docker (Optional)

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
```

Build and run:
```bash
docker build -t auralink-backend .
docker run -p 5000:5000 --env-file .env auralink-backend
```

## Project Structure

```
primetradebackend/
├── src/
│   ├── config/
│   │   └── database.js       # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   └── errorHandler.js   # Error handling
│   ├── models/
│   │   ├── User.js           # User model
│   │   ├── Entity.js         # Entity model
│   │   └── Insight.js        # Insight model
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── entities.js       # Entity routes
│   │   ├── analytics.js      # Analytics routes
│   │   └── insights.js       # Insights routes
│   └── server.js             # Express app and server setup
├── .env                      # Environment variables (not in git)
├── .gitignore
├── package.json
└── README.md
```

## Security Notes

- Always use a strong `JWT_SECRET` in production
- Keep your `.env` file secure and never commit it to version control
- Use HTTPS in production
- Consider enabling rate limiting for production use
- Regularly update dependencies

## License

ISC
