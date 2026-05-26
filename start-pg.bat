@echo off
echo Starting PostgreSQL 18 service...
net start postgresql-x64-18
if %errorlevel% equ 0 (
    echo PostgreSQL started successfully!
) else (
    echo Failed to start. Trying alternative method...
    "C:\Program Files\PostgreSQL\18\bin\pg_ctl" start -D "C:\Program Files\PostgreSQL\18\data" -l "C:\Program Files\PostgreSQL\18\pg_log.txt"
)
echo.
echo Checking if PostgreSQL is ready...
"C:\Program Files\PostgreSQL\18\bin\pg_isready" -h localhost -p 5432
echo.
echo Creating sociogram database...
"C:\Program Files\PostgreSQL\18\bin\createdb" -h localhost -U postgres sociogram 2>nul
echo Done!
pause
