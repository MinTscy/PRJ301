# LUCY LMS

LUCY LMS is a Spring Boot backend for importing multilingual learning materials from `.docx` files and serving structured LMS content by language, stage, and level.

The workspace also contains:

- `frontend/`: Next.js 15 reference web app and Pro live-room dashboard.
- `realtime-service/`: Node.js Agora token, Socket.IO signaling, and automatic stage transition service.
- `wallet-service/`: ASP.NET Core wallet, sandbox top-up, transaction ledger, and realtime gifts.
- `mobile/`: Flutter Pro dashboard source for realtime learner moderation.

Week 8-9 adds SQLite-backed LUCY Coins, sandbox payment flows, room gift
events, LUCY Super audio storage, and Podcast playback on mobile. See
`docs/week-8-9-wallet-recording-podcast-contract.md` for the integration contract.

The project currently focuses on local demo workflows:

- Preview a DOCX file before import.
- Import one DOCX file.
- Import multiple uploaded DOCX files.
- Import all DOCX files from the local `sample-docx` folder.
- Read LMS content through DTO-based REST APIs.

## Week 1-2 Goals

The goal for phase 1, weeks 1-2, is to build a working backend foundation:

- Create a clean Spring Boot 3 project using Java 17 and Maven.
- Configure MySQL with UTF-8/utf8mb4 support for English, Chinese, and Japanese content.
- Design the LMS data model: `Language -> Stage -> Level -> SubLevel -> Content -> AIQuestion`.
- Read `.docx` files with Apache POI.
- Preview DOCX content before importing.
- Import DOCX content into database using rule-based parsing.
- Expose basic content read APIs.
- Document and test APIs through Swagger UI.

## Technology Stack

- Java 17
- Spring Boot 3.3.5
- Maven
- Spring Web
- Spring Data JPA
- MySQL
- Lombok
- Jakarta Validation
- Springdoc OpenAPI / Swagger UI
- Apache POI `poi-ooxml` for reading `.docx`

## Folder Structure

```text
LUCY-LMS
|-- pom.xml
|-- README.md
|-- sample-docx
|   `-- *.docx
`-- src
    `-- main
        |-- java
        |   `-- com
        |       `-- lucy
        |           `-- lms
        |               |-- config
        |               |-- controller
        |               |-- dto
        |               |-- entity
        |               |-- repository
        |               |-- service
        |               `-- util
        `-- resources
            `-- application.properties
```

## Create MySQL Database

Run this SQL in MySQL:

```sql
CREATE DATABASE lucy_lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

The `utf8mb4` charset is required so Japanese and Chinese text is stored correctly.

## Configure `application.properties`

Edit `src/main/resources/application.properties`:

```properties
spring.application.name=lucy-lms

spring.datasource.url=jdbc:mysql://localhost:3306/lucy_lms?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Ho_Chi_Minh
spring.datasource.username=root
# Replace YOUR_MYSQL_PASSWORD with your local MySQL root password.
spring.datasource.password=YOUR_MYSQL_PASSWORD
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.open-in-view=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect
spring.jpa.properties.hibernate.format_sql=true

springdoc.swagger-ui.path=/swagger-ui/index.html
```

Replace:

```properties
spring.datasource.password=YOUR_MYSQL_PASSWORD
```

with your local MySQL password.

## Run The Project

If Maven is installed:

```bash
mvn spring-boot:run
```

If using the local Maven tool downloaded in this workspace:

```powershell
.tools\apache-maven-3.9.9\bin\mvn.cmd spring-boot:run
```

Default server:

```text
http://localhost:8080
```

## Open Swagger

Open:

```text
http://localhost:8080/swagger-ui/index.html
```

Swagger groups:

- Language API
- Stage API
- Level API
- Import API

## Test DOCX Preview API

Endpoint:

```http
POST /api/import/preview
Content-Type: multipart/form-data
```

Multipart key:

```text
file
```

Example:

```bash
curl -X POST "http://localhost:8080/api/import/preview" \
  -F "file=@sample-docx/Eng - STAGE 1 (LEVELS 1-30).docx"
```

Response includes:

- `fileName`
- `totalParagraphs`
- `totalLines`
- `detectedLanguage`
- `detectedStage`
- `detectedLevelRange`
- `previewLines`

## Import One DOCX File

Endpoint:

```http
POST /api/import/docx
Content-Type: multipart/form-data
```

Multipart key:

```text
file
```

Example:

```bash
curl -X POST "http://localhost:8080/api/import/docx" \
  -F "file=@sample-docx/Chinese - level 1-30.docx"
```

The response is `ImportResultDTO`:

```json
{
  "fileName": "Chinese - level 1-30.docx",
  "languageCode": "ZH",
  "stageNumber": 1,
  "levelRange": "1-30",
  "importedLevels": 30,
  "importedSubLevels": 30,
  "importedContents": 100,
  "importedQuestions": 80,
  "status": "SUCCESS",
  "message": "DOCX file imported successfully."
}
```

Actual counts depend on the parsed file content.

## Import Batch Upload

Endpoint:

```http
POST /api/import/docx/batch
Content-Type: multipart/form-data
```

Multipart key:

```text
files
```

Example:

```bash
curl -X POST "http://localhost:8080/api/import/docx/batch" \
  -F "files=@sample-docx/Eng - STAGE 1 (LEVELS 1-30).docx" \
  -F "files=@sample-docx/Chinese - level 1-30.docx"
```

If one file fails, the other files continue importing. The response is `List<ImportResultDTO>`.

## Import From `sample-docx` Folder

Endpoint:

```http
POST /api/import/docx/from-folder
```

Example:

```bash
curl -X POST "http://localhost:8080/api/import/docx/from-folder"
```

This endpoint scans the project root folder:

```text
sample-docx
```

It imports all `.docx` files found there and returns:

```json
{
  "totalFiles": 8,
  "successFiles": 8,
  "failedFiles": 0,
  "results": []
}
```

This API is for local demo use only, not production.

## Data Model

```text
Language
  └── Stage
        └── Level
              └── SubLevel
                    ├── Content
                    └── AIQuestion
```

Entities:

- `Language`: language code and name, for example `EN`, `ZH`, `JA`.
- `Stage`: stage number and stage metadata per language.
- `Level`: level number, title, duration, and parent stage.
- `SubLevel`: ordered section inside a level.
- `Content`: text content under a sub-level.
- `AIQuestion`: question prompt under a sub-level.

API responses use DTOs and do not expose Entity objects directly in detail APIs.

## `sample-docx` Folder

The `sample-docx` folder contains local demo DOCX files used for import testing.

Current files:

```text
Chinese - level 1-30.docx
Chinese - level 31-60.docx
Eng - STAGE 1 (LEVELS 1-30).docx
Eng - STAGE 2 (LEVEL 31-60) REVIEWED_SID.docx
Eng - STAGE 2 (LEVEL 31-60).docx
Janpanes  - ステージ3(レベル61-100).docx
Janpanes - ステージ1(レベル1-30).docx
Janpanes - ステージ2(レベル31-60).docx
```

Filename is important because import detection uses it for:

- Language: `Eng`, `Chinese`, `Japanese`, `ステージ`
- Stage: `STAGE 1`, `STAGE 2`, `STAGE 3`, `ステージ1`, `ステージ2`, `ステージ3`
- Level range: `1-30`, `31-60`, `61-100`

## Common Issues

### MySQL access denied

Symptom:

```text
Access denied for user 'root'@'localhost'
```

Fix:

- Check `spring.datasource.username`.
- Replace `YOUR_MYSQL_PASSWORD` with the real MySQL password.
- Confirm the MySQL user can connect locally.

### Unknown database `lucy_lms`

Symptom:

```text
Unknown database 'lucy_lms'
```

Fix:

```sql
CREATE DATABASE lucy_lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Japanese/Chinese Encoding Is Broken

Symptoms:

- Japanese or Chinese text appears as `????`.
- Imported content is unreadable.

Fix:

- Ensure MySQL database uses `utf8mb4`.
- Ensure JDBC URL has:

```properties
useUnicode=true&characterEncoding=utf8
```

- Recreate database if it was created with a non-UTF charset.

### Apache POI Cannot Read File

Symptoms:

- Import fails with file read errors.
- POI throws an exception while opening the document.

Fix:

- Confirm the file is a real `.docx`, not `.doc` renamed to `.docx`.
- Open and resave the file using Microsoft Word, LibreOffice, or Google Docs.
- Check that the file is not password-protected.

### Swagger Does Not Open

Expected URL:

```text
http://localhost:8080/swagger-ui/index.html
```

Fix:

- Confirm the app is running.
- Check server port in logs.
- Confirm `springdoc-openapi-starter-webmvc-ui` exists in `pom.xml`.
- Check `springdoc.swagger-ui.path=/swagger-ui/index.html`.

## Week 2 Demo Checklist

- MySQL server is running locally.
- Database `lucy_lms` exists with `utf8mb4`.
- `application.properties` has the correct MySQL password.
- Application starts without errors.
- Swagger opens at `/swagger-ui/index.html`.
- `POST /api/import/preview` works with one sample DOCX file.
- `POST /api/import/docx` imports one file successfully.
- `POST /api/import/docx/batch` imports multiple uploaded files.
- `POST /api/import/docx/from-folder` imports files from `sample-docx`.
- Re-running import does not duplicate existing levels.
- `GET /api/languages` returns imported languages.
- `GET /api/stages` returns imported stages.
- `GET /api/levels` returns imported levels.
- `GET /api/levels/{id}/detail` returns sub-levels, contents, and AI questions.
