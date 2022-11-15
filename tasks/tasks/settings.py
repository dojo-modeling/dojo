from pydantic import BaseSettings


class Settings(BaseSettings):

    BIND_PORT: int = 8000
    ELASTICSEARCH_URL: str
    ELASTICSEARCH_PORT: int = 9200
    DMC_URL: str
    DMC_PORT: int = 8080
    DMC_USER: str
    DMC_PASSWORD: str
    DMC_LOCAL_DIR: str

    DATASET_STORAGE_BASE_URL: str
    CSV_FILE_NAME: str = "raw_data.csv"
    DOJO_URL: str

    REDIS_HOST: str
    REDIS_PORT: int = 6379

    DOCKERHUB_URL: str = ""
    DOCKERHUB_USER: str = ""
    DOCKERHUB_PWD: str = ""
    DOCKERHUB_ORG: str = "jataware"

    UVICORN_RELOAD: bool = False

    UAZ_URL: str = ""
    UAZ_THRESHOLD: str = ""
    UAZ_HITS: str = ""

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
