# DogRun Backend API

This is the backend API for the DogRun community app, a platform for dog owners to track their walks, share their routes, and connect with other dog owners.

## Technologies Used

- Node.js & Express
- MongoDB & Mongoose
- JWT Authentication
- Geospatial Queries

## Features

- User Authentication (register, login)
- Pet Management
- Location Tracking
- Walk Recording
- Community Posts & Interactions
- Geospatial Queries (find nearby users & posts)

## Getting Started

### Prerequisites

- Node.js
- MongoDB

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/dogrun
   JWT_SECRET=your_jwt_secret_key_here
   NODE_ENV=development
   UPLOAD_DIR=uploads
   ```

### Running the Server

For development:
```
npm run dev
```

For production:
```
npm start
```

## API Endpoints

### Users

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login and get a token
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `POST /api/users/avatar` - Upload user avatar
- `GET /api/users/:id` - Get user by ID
- `POST /api/users/follow/:id` - Follow/unfollow a user
- `GET /api/users/:id/followers` - Get user followers
- `GET /api/users/:id/following` - Get users that this user is following
- `GET /api/users/stats/me` - Get current user stats

### Pets

- `POST /api/pets` - Create a new pet
- `GET /api/pets` - Get all pets for current user
- `GET /api/pets/:id` - Get pet by ID
- `PUT /api/pets/:id` - Update pet
- `DELETE /api/pets/:id` - Delete pet
- `POST /api/pets/:id/avatar` - Upload pet avatar
- `GET /api/pets/user/:userId` - Get pets by user ID

### Locations

- `PUT /api/locations/update` - Update user location
- `GET /api/locations/nearby` - Get nearby users
- `POST /api/locations/walks` - Create a new walk record
- `GET /api/locations/walks` - Get user's walk records
- `GET /api/locations/walks/:id` - Get walk record by ID
- `PUT /api/locations/walks/:id` - Update walk record
- `DELETE /api/locations/walks/:id` - Delete walk record
- `GET /api/locations/walks/pet/:petId` - Get walk records by pet ID

### Community

- `POST /api/community/posts` - Create a new post
- `GET /api/community/posts` - Get posts feed
- `GET /api/community/posts/nearby` - Get nearby posts
- `GET /api/community/posts/user/:userId` - Get posts by user ID
- `GET /api/community/posts/:id` - Get post by ID
- `PUT /api/community/posts/:id` - Update post
- `DELETE /api/community/posts/:id` - Delete post
- `POST /api/community/posts/:id/like` - Like/unlike a post
- `POST /api/community/posts/:id/comment` - Comment on a post
- `DELETE /api/community/posts/:id/comment/:commentId` - Delete comment 