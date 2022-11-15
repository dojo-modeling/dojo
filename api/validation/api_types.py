import typing
from dataclasses import dataclass
from typing import Any, Dict, Generic, List, Optional, TypeVar, Union

from jsonschema import Draft7Validator, FormatChecker  # type: ignore
from rfc3339_validator import validate_rfc3339  # type: ignore

"""
Validation utilities
"""


def ill_typed_err(name: str, value: Any, expected_type_str: str) -> str:
    actual_type_str = type(value).__name__
    value_str = str(value)
    return f'Expected "{name}" to be of type {expected_type_str}, but {value_str} is of type {actual_type_str}'


def validate_builtin_type(
    name: str, value: Any, expected_type: typing.Type
) -> Optional[str]:
    if isinstance(value, expected_type):
        return None
    else:
        return ill_typed_err(name, value, expected_type.__name__)


def validate_jsonschema_type(
    name: str, value: Any, schema: Dict[str, str]
) -> Optional[str]:
    if Draft7Validator(schema, format_checker=FormatChecker()).is_valid(value):
        return None
    else:
        schema_format = schema["format"]
        value_str = str(value)
        return f"{value_str} is not a valid {schema_format}"


def check_json_number(value):
    """
    Check if value is a number

    This is better than doing isinstance(value, float)
    That will only return True if value has decimals,
    so while 42.0 would be accepted, 42 would be rejected.
    This is stricter than what we want, so we use JSON Schema's
    number type instead, which accepts both integers and floating-point
    numbers. See #92 for more information.
    """
    return Draft7Validator({"type": "number"}).is_valid(value)


"""
Classes corresponding to types from the specification in
https://gitlab-ext.galois.com/world-modelers/galois-internal/model-types-spec
"""

T = TypeVar("T")


@dataclass(frozen=True)
class StrType:
    def equivalent(self: "StrType", other: "Type") -> bool:
        return isinstance(other, StrType)

    def validate(self: "StrType", name: str, value: Any) -> Optional[str]:
        return validate_builtin_type(name, value, str)


@dataclass(frozen=True)
class DatetimeType:
    def equivalent(self: "DatetimeType", other: "Type") -> bool:
        return isinstance(other, DatetimeType)

    def validate(self: "DatetimeType", name: str, value: Any) -> Optional[str]:
        return validate_jsonschema_type(
            name, value, {"type": "string", "format": "date-time"}
        )


@dataclass(frozen=True)
class DateType:
    def equivalent(self: "DateType", other: "Type") -> bool:
        return isinstance(other, DateType)

    def validate(self: "DateType", name: str, value: Any) -> Optional[str]:
        return validate_jsonschema_type(
            name, value, {"type": "string", "format": "date"}
        )


@dataclass(frozen=True)
class TimeType:
    def equivalent(self: "TimeType", other: "Type") -> bool:
        return isinstance(other, TimeType)

    def validate(self: "TimeType", name: str, value: Any) -> Optional[str]:
        # Ideally, we would just use:
        #
        #   return validate_jsonschema_type(name, value, {"type": "string", "format": "time"})
        #
        # Unfortunately, the jsonschema library's validation of time values
        # appears to be buggy, as it will not enforce the RFC 3339 (Section 5.6)
        # requirement that the time adhere to the 'full-time' BNF production,
        # which demands that the end of the value have a 'time-offset'. In
        # practice, jsonschema seems to reject all times with a 'time-offset',
        # so it will treat "20:20:39" as a valid time, but not "20:20:39+00:00".
        # What's worse, the author of jsonschema seems to be aware of this bug:
        # https://github.com/Julian/jsonschema/commit/37671acda2424f1bb13a5e2f5e8f81441d73487b
        #
        # We'd prefer to adhere to RFC 3339, so we instead use a workaround:
        # invoke validate_rfc3339 from the rc3339-validator library directly.
        # (This is what jsonschema attempts to do, but incorrectly.)
        # That library only validates date-times, not times, so for validation
        # purposes we attach an arbitrary date (1970-01-01) to the front.
        if isinstance(value, str):
            if validate_rfc3339("1970-01-01T" + value):
                return None
            else:
                return f"{value} is not a valid time"
        else:
            return ill_typed_err(name, value, "str")


@dataclass(frozen=True)
class BinaryType:
    def equivalent(self: "BinaryType", other: "Type") -> bool:
        return isinstance(other, BinaryType)

    def validate(self: "BinaryType", name: str, value: Any) -> Optional[str]:
        return validate_builtin_type(name, value, str)


@dataclass(frozen=True)
class BooleanType:
    def equivalent(self: "BooleanType", other: "Type") -> bool:
        return isinstance(other, BooleanType)

    def validate(self: "BooleanType", name: str, value: Any) -> Optional[str]:
        return validate_builtin_type(name, value, bool)


@dataclass(frozen=True)
class FloatType:
    def equivalent(self: "FloatType", other: "Type") -> bool:
        return isinstance(other, FloatType)

    def validate(self: "FloatType", name: str, value: Any) -> Optional[str]:
        # You might be tempted to implement this as:
        #     return validate_builtin_type(name, value, float)
        # Don't do this. See the docstring for check_json_number()
        if check_json_number(value):
            return None
        else:
            actual_type_str = type(value).__name__
            value_str = str(value)
            return f'Expected "{name}" to be of type float, but {value_str} is of type {actual_type_str}'


@dataclass(frozen=True)
class IntType:
    def equivalent(self: "IntType", other: "Type") -> bool:
        return isinstance(other, IntType)

    def validate(self: "IntType", name: str, value: Any) -> Optional[str]:
        return validate_builtin_type(name, value, int)


@dataclass(frozen=True)
class ListType:
    type: "Type"

    def equivalent(self: "ListType", other: "Type") -> bool:
        return isinstance(other, ListType) and self.type.equivalent(other.type)


@dataclass(frozen=True)
class TupleType:
    types: List["Type"]

    def equivalent(self: "TupleType", other: "Type") -> bool:
        return isinstance(other, TupleType) and all(
            type1.equivalent(type2) for type1, type2 in zip(self.types, other.types)
        )


@dataclass(frozen=True)
class LonglatType:
    def equivalent(self: "LonglatType", other: "Type") -> bool:
        return isinstance(other, LonglatType)

    def validate(self: "LonglatType", name: str, value: Any) -> Optional[str]:
        value_str = str(value)
        if isinstance(value, list):
            length = len(value)
            if length != 2:
                return f'Expected "{name}" to be a list of length two, but {value_str} has {length} elements'
            else:
                if all(check_json_number(elem) for elem in value):
                    return None
                else:
                    return f'Expected "{name}" to be a list of only numbers, instead found {value_str}'
        else:
            actual_type_str = type(value).__name__
            return f'Expected "{name}" to be a list, but {value_str} is of type {actual_type_str}'


@dataclass(frozen=True)
class DatacubeType:
    def equivalent(self: "DatacubeType", other: "Type") -> bool:
        return isinstance(other, DatacubeType)

    def validate(self: "DatacubeType", name: str, value: Any) -> Optional[str]:
        if isinstance(value, int):
            return None
        else:
            # Rather than use ill_typed_err() here, we give a slightly more
            # descriptive error message, since values of type `datacube` are
            # somewhat special in their treatment.
            actual_type_str = type(value).__name__
            value_str = str(value)
            return f'Expected "{name}" to be a datacube ID (i.e., an int), but {value_str} is of type {actual_type_str}'


@dataclass(frozen=True)
class RowType(Generic[T]):
    type: Dict[str, T]

    def equivalent(self: "RowType", other: "Type") -> bool:
        return (
            isinstance(other, RowType)
            and set(self.type.keys()) == set(other.type.keys())
            and all(
                self.type[key].equivalent(other.type[key]) for key in self.type.keys()
            )
        )


@dataclass(frozen=True)
class ModelParamType:
    type: "ModelParamValueType"
    annotations: Dict[str, Any]

    def equivalent(self: "ModelParamType", other: "Type") -> bool:
        return (
            isinstance(other, ModelParamType)
            and self.type.equivalent(other.type)
            and self.annotations == other.annotations
        )


@dataclass(frozen=True)
class CubeColumnType:
    type: "CubeColumnValueType"
    annotations: Dict[str, Any]

    def equivalent(self: "CubeColumnType", other: "Type") -> bool:
        return (
            isinstance(other, CubeColumnType)
            and self.type.equivalent(other.type)
            and self.annotations == other.annotations
        )


@dataclass(frozen=True)
class ModelType:
    parameters: RowType["ModelParamType"]
    outputs: TupleType

    def equivalent(self: "ModelType", other: "Type") -> bool:
        if isinstance(other, ModelType):
            return self.parameters.equivalent(
                other.parameters
            ) and self.outputs.equivalent(other.outputs)
        else:
            return False


CubeColumnValueType = Union[
    StrType,
    DatetimeType,
    DateType,
    TimeType,
    BinaryType,
    BooleanType,
    FloatType,
    IntType,
    LonglatType,
]


ModelParamValueType = Union[
    CubeColumnValueType,
    DatacubeType,
]


Type = Union[
    StrType,
    DatetimeType,
    DateType,
    TimeType,
    BinaryType,
    BooleanType,
    FloatType,
    IntType,
    ListType,
    TupleType,
    LonglatType,
    DatacubeType,
    RowType,
    ModelType,
    ModelParamType,
    CubeColumnType,
]


type_mapping = {
    "int": IntType(),
    "float": FloatType(),
    "str": StrType(),
    "datetime": DatetimeType(),
    "date": DateType(),
    "time": TimeType(),
    "longlat": LonglatType(),
    "binary": BinaryType(),
    "boolean": BooleanType(),
    "datacube": DatacubeType(),
}
