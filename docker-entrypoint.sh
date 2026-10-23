#!/bin/bash
set -e

# Determine if external MySQL host is configured
if [ -n "$MYSQL_HOST" ] && [ "$MYSQL_HOST" != "localhost" ] && [ "$MYSQL_HOST" != "127.0.0.1" ]; then
    echo "[Entrypoint] External MySQL host specified ($MYSQL_HOST:$MYSQL_PORT). Skipping local daemon."
else
    echo "[Entrypoint] Initializing embedded MySQL / MariaDB server on localhost:3306..."
    
    # Ensure MySQL run directories exist
    mkdir -p /var/run/mysqld /var/lib/mysql
    chown -R mysql:mysql /var/run/mysqld /var/lib/mysql

    # Initialize database if needed
    if [ ! -d "/var/lib/mysql/mysql" ]; then
        mysql_install_db --user=mysql --datadir=/var/lib/mysql > /dev/null 2>&1 || mariadb-install-db --user=mysql --datadir=/var/lib/mysql > /dev/null 2>&1 || true
    fi

    # Start MySQL / MariaDB service
    service mariadb start || service mysql start || /usr/bin/mysqld_safe --skip-syslog &
    
    # Wait for MySQL to become ready
    echo "[Entrypoint] Waiting for database to accept connections..."
    for i in {1..30}; do
        if mysqladmin ping -h localhost --silent 2>/dev/null || mysqladmin -u root ping --silent 2>/dev/null; then
            echo "[Entrypoint] Database is ready."
            break
        fi
        sleep 1
    done

    # Set root password to match application configuration ('bhalaksha')
    mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'bhalaksha'; FLUSH PRIVILEGES;" 2>/dev/null || \
    mysql -u root -e "SET PASSWORD FOR 'root'@'localhost' = PASSWORD('bhalaksha'); FLUSH PRIVILEGES;" 2>/dev/null || true

    # Create databases and seed the 1,234 student records
    echo "[Entrypoint] Seeding schemas and 1,234 student records..."
    node /app/backend/scripts/init_mysql.js 2>/dev/null || true
    echo "[Entrypoint] MySQL database successfully seeded and active."
fi

# Start the unified Node.js backend & frontend server
cd /app/backend
exec node dist/server.js
