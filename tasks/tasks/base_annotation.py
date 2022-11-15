import typing
import pandas as pd


class BaseProcessor:
    @staticmethod
    def run(
        input_data: typing.Any, context: typing.Dict[str, typing.Any]
    ) -> pd.DataFrame:
        raise NotImplemented()
