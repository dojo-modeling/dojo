################################################################
# Dojo
################################################################


from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from validation import ModelSchema, IndicatorSchema


class IndicatorSearchResult(BaseModel):
    hits: int = Field(title="Total hits for query", example="113")
    results: List[IndicatorSchema.IndicatorMetadataSchema] = Field(
        title="Results", description="Array of result objects"
    )
    scroll_id: Optional[str] = Field(
        title="Scroll ID",
        description="Provide this scroll ID to receive the next page of results",
    )


class ModelAccessory(BaseModel):
    id: Optional[str]
    model_id: str = Field(
        title="Model ID",
        description="The ID (`ModelSchema.ModelMetadata.id`) of the related model",
        example="abcd-efg-1233",
    )
    path: str = Field(
        title="File Path",
        description="The file path where the accessory file must be mounted.",
        example="/model/settings/my_img.png",
    )
    caption: Optional[str] = Field(
        title="accessory caption",
        description="A caption for the accessory file",
        example="This is an image of a flooding forecast",
    )


class ModelConfig(BaseModel):
    model_id: str = Field(
        title="Model ID",
        description="The ID (`ModelSchema.ModelMetadata.id`) of the related model",
        example="abcd-efg-1233",
    )
    s3_url: str = Field(
        title="S3 URL",
        description="The S3 URL where the config file is located",
        example="https://dojo_s3_bucket.s3.amazonaws.com/dummy-model/config.json",
    )
    s3_url_raw: str = Field(
        title="S3 URL (raw)",
        description="The S3 URL where the raw config file is located",
        example="https://dojo_s3_bucket.s3.amazonaws.com/dummy-model/raw-config.json",
    )
    path: str = Field(
        title="File Path",
        description="The file path where the conf file must be mounted.",
        example="/model/settings/config.json",
    )

    class Config:
        extra = "allow"


class ModelDirective(BaseModel):
    model_id: str = Field(
        title="Model ID",
        description="The ID (`ModelSchema.ModelMetadata.id`) of the related model",
        example="abcd-efg-1233",
    )
    command: str = Field(
        title="Model Container command",
        description="The model container command, templated using Jinja. Templated fields must correspond with the name of the model parameters.",
        example="python3 dssat.py --management_practice = {{ management_practice }}",
    )
    command_raw: str = Field(
        title="Model Container command",
        description="The raw model container command",
        example="python3 dssat.py --rainfall = .5 ",
    )
    cwd: str = Field(
        title="Current Working Directory",
        description="Current Working Directory for Model Container command",
        example="/home/clouseau/model",
    )

    class Config:
        extra = "allow"


class ModelOutputFile(BaseModel):
    id: str
    model_id: str = Field(
        title="Model ID",
        description="The ID (`ModelSchema.ModelMetadata.id`) of the related model",
        example="abcd-efg-1233",
    )
    name: str = Field(
        title="Output File Name",
        description="The name of the output file",
        example="Yield Forecast",
    )
    output_directory: str = Field(
        title="Model Output Directory",
        description="The location of the model outputs within the model container. This will be mounted in order to retriee output files.",
        example="/results",
    )
    path: str = Field(
        title="Output File Path",
        description="The relative file path of the output file within the model's `output_directory`",
        example="yield_forecast.csv",
    )
    file_type: str = Field(
        title="Output File Type",
        description="The type of the output file",
        enum=["csv", "geotiff", "netcdf"],
        example="csv",
    )
    transform: Dict = Field(
        title="Annotate Transform Directives",
        description="A dictionary of Annotate generated transform directives that are used to convert the model output file into a standardized schema",
        example={"x": "lng", "y": "lat"},
    )
    prev_id: Optional[str] = Field(
        title="Previous output file id",
        description="If this is not the original version what was the last model outputfile ID",
        example="fjd23k-s1a0j2-fds...",
    )

    class Config:
        extra = "allow"


class ModelSearchResult(BaseModel):
    hits: int = Field(title="Total hits for query", example="113")
    results: List[ModelSchema.ModelMetadataSchema] = Field(
        title="Results", description="Array of result objects"
    )
    scroll_id: Optional[str] = Field(
        title="Scroll ID",
        description="Provide this scroll ID to receive the next page of results",
    )


class ParameterFormatter(BaseModel):
    """
    A formatter for a model parameters that are date or time
    """

    id: str
    model_id: str = Field(
        title="Model ID",
        description="The ID (`ModelSchema.ModelMetadata.id`) of the related model",
        example="abcd-efg-1233",
    )
    format: str = Field(
        title="Format String",
        description="The format of the model parameter using strftime",
        example="%m/%d/%Y",
    )


