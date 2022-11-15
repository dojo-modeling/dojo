from typing import Any, Dict, List

from validation import schemas


def validate_parameters(
    parameter_values: Dict[str, Any], model_parameters: Dict[str, Dict[str, Any]]
) -> List[ValueError]:
    """
    Validate the parameters passed as a job POST request payload against the requirements specified in the model metadata

    parameter_values:
        Dictionary of {"parameter_name": parameter_value}
        Example: {"param1": "foo", "param2": 1}
    model_parameters:
        The "parameters" key of the "type" field of the database model, i.e. db.Model.type['parameters']
        See here: https://gitlab-ext.galois.com/world-modelers/galois-internal/supermaas/-/blob/master/supermaas/supermaas/api/models.py#L29

    Returns:
        List[ValueError] containing any errors found
        If none are found, return empty list
    """
    errors = []

    parameter_names_expected = set(model_parameters.keys())
    parameter_names_actual = set(parameter_values.keys())
    missing_parameter_names = parameter_names_expected - parameter_names_actual
    for missing_parameter_name in missing_parameter_names:
        errors.append(
            ValueError(
                f"Model expects a parameter named '{missing_parameter_name}', but none was provided"
            )
        )

    for name, value in parameter_values.items():
        try:
            schemas.check_param_value(
                value=value,
                name=name,
                typ=model_parameters[name]["type"],
                choices=model_parameters[name]["annotations"]["choices"],
                min=model_parameters[name]["annotations"]["min"],
                max=model_parameters[name]["annotations"]["max"],
                boundary=model_parameters[name]["annotations"]["boundary"],
            )
        except ValueError as e:
            errors.append(e)
        except KeyError as e:  # this will happen if name is not found in list of parameters
            errors.append(
                ValueError(
                    f"Model received a parameter named {e} which it did not expect"
                )
            )

    return errors
