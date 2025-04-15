# Summer Swing League Website

A web application for managing golf scores and standings for the Summer Swing League.

## Features

- Score submission
- Standings tracking
- Player profiles
- Course management

## Requirements

- PHP 8.0 or higher
- PostgreSQL 12 or higher
- Composer
- Web server (Apache/Nginx)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/summer-swing-league.git
cd summer-swing-league
```

2. Install dependencies:
```bash
composer install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your database credentials and other settings.

5. Set up the database:
```bash
# Create the database
createdb ssl_golf

# Run migrations (when available)
php src/scripts/migrate.php
```

6. Configure your web server to point to the `public` directory.

## Development

- The application uses a simple MVC architecture
- All PHP files are in the `src` directory
- Public assets are in the `public` directory
- Views are in `src/Views`
- Controllers are in `src/Controllers`
- Models are in `src/Models`

## Security

- All database credentials are stored in environment variables
- Input validation is performed on all user inputs
- Prepared statements are used for all database queries
- Session security is implemented

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 