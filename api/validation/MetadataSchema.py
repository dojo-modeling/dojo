from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, Extra


# Metadata Model Used to store annotation data along with any other metadata we may need inside of a dictionary with string keys and any type of data.

class FileType(str, Enum):
    CSV = "csv"
    EXCEL = "excel"
    NETCDF = "netcdf"
    GEOTIFF = "geotiff"


class ColumnType(str, Enum):
    DATE = "date"
    GEO = "geo"
    FEATURE = "feature"


class DateType(str, Enum):
    YEAR = "year"
    MONTH = "month"
    DAY = "day"
    EPOCH = "epoch"
    DATE = "date"


class GeoType(str, Enum):
    LATITUDE = "latitude"
    LONGITUDE = "longitude"
    COORDINATES = "coordinates"
    COUNTRY = "country"
    ISO2 = "iso2"
    ISO3 = "iso3"
    STATE = "state/territory"
    COUNTY = "county/district"
    CITY = "municipality/town"


class FeatureType(str, Enum):
    INT = "int"
    FLOAT = "float"
    STR = "str"
    BINARY = "binary"
    BOOLEAN = "boolean"


class CoordFormat(str, Enum):
    LONLAT = "lonlat"
    LATLON = "latlon"


class GadmLevel(str, Enum):
    ADMIN3 = "admin3"
    ADMIN2 = "admin2"
    ADMIN1 = "admin1"
    ADMIN0 = "admin0"
    COUNTRY = "country"


#################################
#### DEFINE ANNOTATION TYPES ####
#################################
class GeoAnnotation(BaseModel):
    name: str
    display_name: Optional[str]
    description: Optional[str]
    type: ColumnType = "geo"
    geo_type: GeoType
    primary_geo: Optional[bool]
    resolve_to_gadm: Optional[bool]
    is_geo_pair: Optional[str] = Field(
        title="Geo Pair",
        description="If present, this is the name of a paired coordinate column.",
        example="Lon_",
    )
    coord_format: Optional[CoordFormat] = Field(
        title="Coordinate Format",
        description="If geo type is COORDINATES, then provide the coordinate format",
    )
    qualifies: Optional[List[str]] = Field(
        title="Qualifies Columns",
        description="An array of the column names which this qualifies",
        example=["crop_production", "malnutrition_rate"],
    )
    aliases: Dict[str, str] = {}
    gadm_level: Optional[GadmLevel] = Field(
        None,
        title="GADM Reverse Geocode Level",
        description="Level to reverse geocode gadm to",
        example="admin3",
    )


class TimeField(str, Enum):
    YEAR = "Year"
    MONTH = "Month"
    DAY = "Day"
    HOUR = "Hour"
    MINUTE = "Minute"


class DateAnnotation(BaseModel):
    name: str = Field(example="year_column")
    display_name: Optional[str]
    description: Optional[str]
    type: ColumnType = "date"
    date_type: DateType
    primary_date: Optional[bool]
    time_format: str = Field(
        title="Time Format",
        description="The strftime formatter for this field",
        example="%y",
    )
    associated_columns: Optional[Dict[TimeField, str]] = Field(
        title="Associated datetime column",
        description="the type of time as the key with the column name being the value",
        example={"day": "day_column", "hour": "hour_column"},
    )
    qualifies: Optional[List[str]] = Field(
        title="Qualifies Columns",
        description="An array of the column names which this qualifies",
        example=["crop_production", "malnutrition_rate"],
    )
    aliases: Dict[str, str] = {}


class FeatureAnnotation(BaseModel):
    name: str
    display_name: Optional[str]
    description: str
    type: ColumnType = "feature"
    feature_type: FeatureType
    units: Optional[str]
    units_description: Optional[str]
    qualifies: Optional[List[str]] = Field(
        title="Qualifies Columns",
        description="An array of the column names which this qualifies",
        example=["crop_production", "malnutrition_rate"],
    )
    qualifierrole: Optional[str]
    aliases: Dict[str, str] = {}



class AnnotationSchema(BaseModel):
    class Config:
        extra = Extra.allow
    
    geo: Optional[List[GeoAnnotation]]
    date: Optional[List[DateAnnotation]]
    feature: Optional[List[FeatureAnnotation]]


class MetaModel(BaseModel):
    metadata: Optional[Dict[str, Any]] = {}
    annotations: Optional[AnnotationSchema] = None
