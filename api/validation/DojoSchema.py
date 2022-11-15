################################################################
# Dojo
################################################################


from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from validation import RunSchema, ModelSchema, IndicatorSchema


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

class Annotation(BaseModel):
    name: str = Field(
        ...,
        description="The name of the parameter that the user references to access the annotation",
        text="Name"
    )
    description: str = Field(
        ...,
        description="The description of the parameter",
        text="Description"
    )
    type: ModelSchema.Type = Field(
        ...,
        description="The basic type",
        text="Type"
    )
    default_value: str = Field(
        ...,
        description="The value to use for replacement if the user does not pass in one",
        text="Default Value"
    )
    unit: str = Field(
        ...,
        description="The unit of the object being annotated",
        text="Unit"
    )
    unit_description: str = Field(
        ...,
        description="Some information about the unit",
        text="Unit Description"
    )
    data_type: ModelSchema.DataType = Field(
        ...,
        description="Some additional type information used by Causemos",
        text="Data Value Type"
    )
    predefined: bool = Field(
        False,
        description="Whether to use a list of options",
        text="Predefined"
    )
    options: List[str] = Field(
        ...,
        description="The only options if predefined",
        text="Options"
    )
    # NOTE: DO we want to store these as floats instead?
    # Currently, Causemos wants them as a float, but what if they are ints?
    min: str = Field(
        ...,
        description="If the parameter is a numeric type, state the inclusive min of parameter values",
        text="Parameter Minimum"
    )
    max: str = Field(
        ...,
        description="If the parameter is a numeric type, state the inclusive max of parameter values",
        text="Parameter Minimum"
    )


class Parameter(BaseModel):
    start: int = Field(
        ...,
        description="The index that indicates where to start replacement",
        text="Start Index"
    )
    end: int = Field(
        ...,
        description="The index that indicates where to end replacement",
        text="Ending Index"
    )
    text: str = Field(
        ...,
        description="The text in-between start and end",
        text="Original Text"
    )
    annotation: Annotation = Field(
        ...,
        description="The corresponding annotation",
        text="Annotation"
    )


class ModelDirective(BaseModel):
    model_id: str = Field(
        title="Model ID",
        description="The ID (`ModelSchema.ModelMetadata.id`) of the related model",
        example="abcd-efg-1233",
    )
    command: str = Field(
        title="Model Container command",
        description="The model container command",
        example="python3 main.py --temp 1.3 ",
    )
    cwd: str = Field(
        title="Current Working Directory",
        description="Current Working Directory for Model Container command",
        example="/home/terminal/model",
    )
    parameters: List[Parameter] = Field(
        ...,
        description="The parameters that apply to this directive",
        title="Directive Parameters",
    )

    class Config:
        extra = "allow"


class ModelConfig(BaseModel):
    model_id: str = Field(
        title="Model ID",
        description="The ID (`ModelSchema.ModelMetadata.id`) of the related model",
        example="abcd-efg-1233",
    )
    path: str = Field(
        title="File Path",
        description="The file path where the conf file must be mounted.",
        example="/model/settings/config.json",
    )
    parameters: List[Parameter] = Field(
        ...,
        description="The parameters that apply to the configuration file given by path",
        title="Config Parameters",
    )

    class Config:
        extra = "allow"

class ModelConfigCreate(BaseModel):
    model_config: ModelConfig = Field(
        title="Model Config",
        description="A config that needs to be registered"
    )
    file_content: str = Field(
        title="File Contents",
        description="The contents of the config file that need to be written"
    )


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
        title="Annotater Transform Directives",
        description="A dictionary of Annotater generated transform directives that are used to convert the model output file into a geotemporal compliant schema",
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

class RunSearchResult(BaseModel):
    hits: int = Field(title="Total hits for query", example="113")
    results: List[RunSchema.ModelRunSchema] = Field(
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


class StatusAction(Enum):
    """
    The status actions are options that decide how to handle the status of
    each model given.

    - ignore: Do not trigger any tests
    - fill: Trigger test if no default run exists
    - force: Trigger test for each given model
    """
    ignore = "ignore"
    fill = "fill"
    force = "force"


class TestBatch(BaseModel):
    """
    The test batch takes a list of models and returns the statuses while
    using the status action provided.
    """

    model_ids: List[str] = Field(
        [],
        title="Model IDs",
        description="The models that need their statuses checked",
    )
    action: StatusAction = Field(
        StatusAction.ignore,
        title="Model IDs",
        description="Which action to use for each entry",
    )
