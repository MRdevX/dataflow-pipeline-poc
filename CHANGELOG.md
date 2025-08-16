# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.3.0](https://github.com/MRdevX/dataflow-pipeline-poc/compare/v1.2.0...v1.3.0) (2025-08-16)


### Features

* **api:** add all supported import types to Postman collection ([0427644](https://github.com/MRdevX/dataflow-pipeline-poc/commit/0427644d12a31a97c6efdde8bc7f6450c76bb3a8))
* **tests:** add missing tests for upload scenarios ([9b2755b](https://github.com/MRdevX/dataflow-pipeline-poc/commit/9b2755bad77195149f1c634971a9de1c0408394f))


### Bug Fixes

* **import.utils:** handle empty content type apply use early returns ([081743d](https://github.com/MRdevX/dataflow-pipeline-poc/commit/081743d9fa5cde951407e3135bbd04092218231a))

## [1.2.0](https://github.com/MRdevX/take-home-backend/compare/v1.1.0...v1.2.0) (2025-08-12)


### Features

* **import:** enhance error handling and validation ([5621cb1](https://github.com/MRdevX/take-home-backend/commit/5621cb17e5feaf0dc77b56d2320e703bbecec288))
* **import:** optimize imports by adding file and stream upload endpoints ([d2b5719](https://github.com/MRdevX/take-home-backend/commit/d2b5719de7b930193110b2f1dffc694ec93376e9))
* **import:** refactor and enhance import routes and services ([0fa59ee](https://github.com/MRdevX/take-home-backend/commit/0fa59ee08eb9eceb35cb0e35dffb01cf8c865fd1))
* **tests:** add missing tests & enhance tests structure ([8d2bc78](https://github.com/MRdevX/take-home-backend/commit/8d2bc78d4297bb48e67f605de1b41340595e6010))
* **tests:** add resumable upload pause/resume tests to E2E suite ([a058a96](https://github.com/MRdevX/take-home-backend/commit/a058a96d021a0ecc5e3bbdbaf4396c836ae87f7a))
* **tests:** enhance E2E test suite with large dataset and resumable uploads ([0fa11ca](https://github.com/MRdevX/take-home-backend/commit/0fa11ca2de0fe592635b20c7007c0aa9bf8ea92c))
* **tests:** implement test tracking and reporting in E2E suite ([2e808c4](https://github.com/MRdevX/take-home-backend/commit/2e808c498d0d6d97bc7936dc648f042ca633f524))
* **upload:** improve resumable uploads tracking ([a3975cc](https://github.com/MRdevX/take-home-backend/commit/a3975cc49289b4aa4a601d318ba42111290fea4d))


### Bug Fixes

* **import:** decouple cleanup failure from job success ([6b08459](https://github.com/MRdevX/take-home-backend/commit/6b08459d9d032609b306b1e488fcf221afd4299d))

## 1.1.0 (2025-08-11)


### Features

* **app:** add hono built-in middlewares for logging, CORS, and powered-by headers ([6a840d7](https://github.com/MRdevX/take-home-backend/commit/6a840d72e6965f5e9e392371bb51cbd85905d697))
* **config:** add dotenv integration and environment variable validation ([5d14420](https://github.com/MRdevX/take-home-backend/commit/5d144200ee6802155094ecd94caaa1a2513e2390))
* **health:** add health check route to monitor application status ([76e0d2f](https://github.com/MRdevX/take-home-backend/commit/76e0d2fa866d422044cfc45975c930071e06fbab))
* implement basic import endpoint ([03645a8](https://github.com/MRdevX/take-home-backend/commit/03645a80a95e4293f65325f690b2794fd4b1e395))
* **import:** enhance import processing logic ([7b0ab8d](https://github.com/MRdevX/take-home-backend/commit/7b0ab8d7903a747a886caf0555676e5bfa0fd0df))
* **import:** integrate zod validation and apply hono best practices ([3e3af2b](https://github.com/MRdevX/take-home-backend/commit/3e3af2b52dc7898cf74446f1b8c66dd682c0cf34))
* **import:** refactor import job processing to use dependency injection and add unit tests ([84bbfc3](https://github.com/MRdevX/take-home-backend/commit/84bbfc34f894da9069f6f571dee632d662ac226a))
* **metrics:** add metrics config and middleware ([bb1714d](https://github.com/MRdevX/take-home-backend/commit/bb1714d2514b00d9ab9b0329c456ceee40a5f1b7))
* **PostgREST:** replace supabase client with PostgREST ([9714178](https://github.com/MRdevX/take-home-backend/commit/9714178d75b903e293607fd834618e17423b4b8c))
* **postman:** add Postman collection and environment ([35d05e8](https://github.com/MRdevX/take-home-backend/commit/35d05e8815fc936482ae22f9ac12771a59716e6d))
* **tests:** add fixtures and utility functions for testing ([99e2939](https://github.com/MRdevX/take-home-backend/commit/99e293955c2376e6547d5ed015f17b5dac1a9ec4))
* **tests:** add unit and integration tests for import service and validation schemas ([4eeab08](https://github.com/MRdevX/take-home-backend/commit/4eeab081f08ccf9532eae2e364c3fd549f72c5aa))
* **tests:** complete E2E test suite ([af02695](https://github.com/MRdevX/take-home-backend/commit/af0269503171087a521ca28827a1205cdcaf901d))
* **upload:** implement resumable uploads and enhance configuration for file handling ([e676e09](https://github.com/MRdevX/take-home-backend/commit/e676e096545392e057e40a4de2378f3f6e772cad))
* **validation:** add contact schema validation ([64f2005](https://github.com/MRdevX/take-home-backend/commit/64f2005002df7a9b13a0efeabee8e0bbe54fade7))
* **worker:** implement worker for processing imports ([468ad34](https://github.com/MRdevX/take-home-backend/commit/468ad3469185c00d79b44a7f2053ba0ad4f59406))
* **worker:** improve worker configuration ([5f42dd5](https://github.com/MRdevX/take-home-backend/commit/5f42dd5029be88a5b309fcf60ec0cd44dda38f7f))


### Bug Fixes

* **config:** correct formatting ([417e66a](https://github.com/MRdevX/take-home-backend/commit/417e66a64c552e9dae034db44d24a27f43e86e79))
