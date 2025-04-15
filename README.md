# Summer Swing League Website

A modern web application for managing the Summer Swing League golf competition.

## Features

- Player registration with handicap calculation
- League standings with real-time updates
- Detailed rules and scoring information
- Responsive design for all devices

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL (Heroku)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Heroku account (for deployment)

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/matthewmcalear/SummerSwingLeague.git
   cd SummerSwingLeague
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following:
   ```
   DATABASE_URL="your_database_url"
   ```

4. Initialize the database:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

The application is configured to deploy automatically to Heroku when changes are pushed to the main branch.

1. Make sure your Heroku app is connected to the GitHub repository
2. Push your changes to the main branch
3. Heroku will automatically build and deploy the application

## Database Schema

### Player
- id: Int (Primary Key)
- name: String
- email: String (Unique)
- handicap: Float
- createdAt: DateTime
- updatedAt: DateTime

### Round
- id: Int (Primary Key)
- date: DateTime
- courseName: String
- difficulty: String
- holeCount: Int
- createdAt: DateTime
- updatedAt: DateTime

### Score
- id: Int (Primary Key)
- playerId: Int (Foreign Key)
- roundId: Int (Foreign Key)
- grossScore: Int
- basePoints: Float
- adjustment: Float
- bonusPoints: Int
- totalPoints: Float
- createdAt: DateTime
- updatedAt: DateTime

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License. 