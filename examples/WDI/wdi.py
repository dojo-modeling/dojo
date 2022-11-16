from subprocess import call
import os
from glob import glob
from zipfile import ZipFile
import time
from tqdm import tqdm
from datetime import datetime, timezone
from uuid import uuid4
import pdb
import pandas as pd
import json
import argparse
from elasticsearch import Elasticsearch
import boto3


def populate_wdi_data(args):
    try:
        print(args)
        download_data()

        raw_data = pd.read_csv("data/WDIData.csv")

        # list of valid country codes
        # countries = pd.read_csv('src/data/country.csv')
        countries = pd.read_csv("examples/WDI/country.csv")
        country_codes = set(countries["Alpha-3_Code"].tolist())
        series_info = pd.read_csv("data/WDISeries.csv")

        # DEBUG. user should define what the groups are in indicator_groups.json
        save_indicators(raw_data, series_info)

        # delete all CSVs and json files in output folder
        for filename in (
            glob("output/*.csv") + glob("output/*.json") + glob("output/*.gzip")
        ):
            os.remove(filename)

        for name, indicators in tqdm(
            indicator_groups(),
            total=sum(1 for _ in indicator_groups()),
            desc="Making datasets",
        ):

            # TODO: come up with better description from somewhere...
            description = f'World Bank Development Indicators: {", ".join(indicators)}'

            # collect all rows in df that have an indicator in indicators
            df_subset = raw_data[raw_data["Indicator Code"].isin(set(indicators))]

            # make dataset
            df = make_dataset(df_subset, country_codes, countries)

            # create metadata for dataset
            meta = make_metadata(df, series_info, name, description)  # , feature_codes)

            # # ensure output folder exists
            if not os.path.exists("output"):
                os.makedirs("output")

            # # save data to csv and metadata to json
            df.to_csv(os.path.join("output", f"{name}.csv"), index=False)
            with open(os.path.join("output", f"{name}_meta.json"), "w") as f:
                json.dump(meta, f)

            # make parquet files
            save_parquet(df, name)

            ## upload csv and parquet to s3
            upload_files_to_s3(meta.get("id"), name, args)

            # update meta data_paths
            meta["data_paths"] = [
                f's3://{args.bucket}/datasets/{meta.get("id")}/{meta.get("id")}.parquet.gzip'
            ]

            # # save meta data to elasticsearch
            save_meta_es(meta)
    except Exception as e:
        print(f"error {e}")


def download_data():
    """download data and unzip if not already done"""

    data_link = "http://databank.worldbank.org/data/download/WDI_csv.zip"

    # download to 'data' folder if not already downloaded
    if not os.path.exists("data"):
        os.makedirs("data")
    if not os.path.exists("data/WDI_csv.zip"):
        call(["wget", data_link, "-O", "data/WDI_csv.zip"])
    else:
        print("Skipping download, data already exists")

    # unzip data if not already unzipped
    with ZipFile("data/WDI_csv.zip", "r") as zip_ref:
        filenames = zip_ref.namelist()
        if not all([os.path.exists("data/" + filename) for filename in filenames]):
            print("Unzipping data...", end="", flush=True)
            zip_ref.extractall("data")
            print("Done")
        else:
            print("Skipping unzip, data already exists")


def save_indicators(df, series_info):
    """For debugging purposes, create mock version of indicator_groups.json"""

    indicators = df["Indicator Code"].unique().tolist()
    firsts = [indicator.split(".")[0] for indicator in indicators]
    # seconds = [f"{first}.{indicator.split('.')[1]}" for first, indicator in zip(firsts,indicators)]
    first_counts = {first: firsts.count(first) for first in set(firsts)}

    groups = {}
    for indicator, first in zip(indicators, firsts):
        count = first_counts[first]
        if count < 100:
            if first not in groups:
                groups[first] = []
            groups[first].append(indicator)
        else:
            second = f"{first}.{indicator.split('.')[1]}"
            if second not in groups:
                groups[second] = []
            groups[second].append(indicator)

    # collect all indicators in groups of size 1 and put them in a group called 'misc'
    misc = []
    todelete = []
    for group, indicators in groups.items():
        if len(indicators) == 1:
            misc.append(indicators[0])
            todelete.append(group)
    for group in todelete:
        del groups[group]
    groups["misc"] = misc

    # get the fully qualified names based on the indicator code groupings
    abbrevs = find_abbreviations(groups, series_info)

    # map from name of group to its indicators
    indicators = {
        f"WDI - {abbrevs[prefix]}": indicators for prefix, indicators in groups.items()
    }

    with open("indicator_groups.json", "w") as f:
        json.dump(indicators, f)
    # DEBUG plot a histogram of the number of indicators in each group
    # from matplotlib import pyplot as plt
    # counts = sorted([len(indicators) for indicators in groups.values()])
    # print(counts)
    # plt.hist(counts, bins=100)
    # plt.xlabel('Number of indicators in group')
    # plt.ylabel('Number of groups')
    # plt.title('Indicator Group Sizes')
    # plt.show()


def find_abbreviations(all_codes, info):
    # prefill some of the abbreviations
    code_chunk_abbreviations = {
        "EG": "",
        "FX": "",
        "SE": "education",
        "PRM": "",
        "NY": "national_accounts",
        "SP": "health.SP",  # 'health', #TODO:
        "SEC": "",
        "SH": "health.SH",  # 'health', #TODO:shared health?
        "HIV": "HIV",
        "AG": "",
        "EN": "environment.EN",
        "TX": "trade_exports",
        "TM": "trade_imports",
        "NV": "national_value",
        "IS": "",
        "ER": "environment.ER",
        "SI": "share_income",
        "STA": "standard",
        "MS": "",
        "FB": "financial_banking",
        "IC": "",
        "SL": "",
        "TLF": "total_labor_force",
        "FD": "",
        "VC": "",
        "FM": "financial_monetary",
        "DTH": "death",
        "GC": "government_currency",
        "NE": "national_expenditure",
        "BM": "balance_money",
        "BX": "balance_exports",
        "AGR": "",
        "MNF": "",
        "SRV": "",
        "SLF": "",
        "FAM": "",
        "WAG": "",
        "MLR": "",
        "FS": "",
        "DT": "external_debt",
        "MED": "",
        "COM": "",
        "CON": "",
        "FP": "financial_prices",
        "SN": "",
        "IQ": "",
        "BN": "balances",
        "XPD": "expenditure",
        "PA": "",
        "FPL": "family_planning",
        "FR": "interest_rate",
        "TER": "",
        "EMP": "employment",
        "IND": "",
        "IT": "information_technology",
        "GDP": "GDP",
        "HD": "human_development",
        "IMM": "",
        "TBS": "",
        "UHC": "universal_health_coverage",
        "IP": "intellectual_property",
        "SM": "social_migration",
        "ST": "travel_tourism",
        "IE": "",
        "LP": "logistics_performance",
        "MMR": "maternal_mortality",
        "CM": "capital_market",
        "ADT": "",
        "TG": "trade_goods",
        "DYN": "",
        "TT": "trade_index",
        "DC": "debt",
        "VAC": "vaccination",
        "SGR": "",
        "H2O": "water",
        "PRE": "",
        "ANM": "",
        "PRG": "",
        "PRV": "",
        "SVR": "",
        "GF": "government_finance",
        "SG": "social_gender",
        "EP": "energy_price",
        "PX": "private_exchange",
        "GB": "research_expenditure",
        "ENR": "",
        "UEM": "",
        "ALC": "",
        "FI": "",
        "BG": "balance_goods",
        "per_si_allsi": "social_insurance",
        "per_allsp": "social_protection",
        "per_sa_allsa": "socal_assistance",
        "per_lm_alllm": "labor_market",
        "misc": "miscellaneous",
    }

    # separate out codes that contain lower case letters
    auto = [code for code in all_codes if not any([char.islower() for char in code])]
    manual = [code for code in all_codes if code not in set(auto)]

    chunks = {chunk: all_codes[code] for code in auto for chunk in code.split(".")}

    def count_nonletters(string):
        return len([char for char in string if not char.isalpha()])

    def is_abbreviation(abbr: str, word: str) -> int:
        """
        returns a score for how well the abbreviation matches the word.
        lower score is better
        None if it doesn't match
        """
        abbr, word = abbr.lower(), word.lower()
        letters = set(word)

        if any([char not in letters for char in abbr]):
            return None

        # must start with the same letter
        if abbr[0] != word[0]:
            return None

        # check if the letters in abbr appear in order in word
        i = 0
        for char in abbr:
            i = word.find(char, i)
            if i == -1:
                return None
            i += 1

        return i  # 1 #TODO score

    from typing import List

    def get_candidates(sentences: List[str]) -> List[str]:
        candidates = []
        for sentence in sentences:
            if not isinstance(sentence, str):
                continue
            for word in sentence.split():
                if count_nonletters(word) > 1:
                    continue
                word = "".join([char for char in word if char.isalpha()])
                word = word.lower()
                if (score := is_abbreviation(chunk, word)) is not None:
                    candidates.append((word, score))

        # collect candidates with the lowest score
        candidates = sorted(candidates, key=lambda x: x[1])
        candidates = [
            (word, score) for word, score in candidates if score == candidates[0][1]
        ]

        return [*set(candidates)]

    for chunk, codes in chunks.items():
        if code_chunk_abbreviations[chunk] != "":
            continue

        # collect lines from info where info['Series Code'] is in codes
        codes = set(codes)
        lines = info[info["Series Code"].isin(codes)]

        # get the topic strings, filtering out any lines that were nan
        topics = lines["Topic"].unique().tolist()
        candidates = get_candidates(topics)

        if len(candidates) == 1:
            code_chunk_abbreviations[chunk] = candidates[0][0]
            continue
        elif len(candidates) > 1:
            print(f"Multiple candidates for {chunk}: {candidates}")
            pdb.set_trace()

        names = lines["Indicator Name"].unique().tolist()
        candidates = get_candidates(names)

        if len(candidates) == 1:
            code_chunk_abbreviations[chunk] = candidates[0][0]
            continue
        elif len(candidates) > 1:
            print(f"Multiple candidates for {chunk}: {candidates}")
            pdb.set_trace()

        shortdefs = lines["Short definition"].unique().tolist()
        candidates = get_candidates(shortdefs)

        if len(candidates) == 1:
            code_chunk_abbreviations[chunk] = candidates[0][0]
            continue
        elif len(candidates) > 1:
            print(f"Multiple candidates for {chunk}: {candidates}")
            pdb.set_trace()

        longdefs = lines["Long definition"].unique().tolist()
        candidates = get_candidates(longdefs)

        if len(candidates) == 1:
            code_chunk_abbreviations[chunk] = candidates[0][0]
            continue
        elif len(candidates) > 1:
            print(f"Multiple candidates for {chunk}: {candidates}")
            pdb.set_trace()

        source = lines["Source"].unique().tolist()
        candidates = get_candidates(source)

        if len(candidates) == 1:
            code_chunk_abbreviations[chunk] = candidates[0][0]
            continue
        elif len(candidates) > 1:
            print(f"Multiple candidates for {chunk}: {candidates}")
            pdb.set_trace()

        print(f"No candidates for {chunk}")

        # get a single string that combines with space all lines['Topic'], lines['Indicator Name'], lines['Short Definition'],  lines['Long Definition']
        # lines = lines['Topic'].tolist() + lines['Indicator Name'].tolist() + lines['Short definition'].tolist()# + lines['Long definition'].tolist()
        # lines = set([line for line in lines if not pd.isnull(line)])
        # text = '\n'.join()

    # find duplicates in code_chunk_abbreviations
    # abbreviations = set(code_chunk_abbreviations.values())
    # duplicates = [abbr for abbr in abbreviations if list(code_chunk_abbreviations.values()).count(abbr) > 1]

    # pdb.set_trace()
    def unabbreviate_prefix(prefix):
        chunks = prefix.split(".")
        chunks = [code_chunk_abbreviations[chunk] for chunk in chunks]
        return ".".join(chunks)

    # create a map from the full code to the abbreviation
    code_abbreviations = {}
    for prefix, codes in all_codes.items():
        full = unabbreviate_prefix(prefix)
        code_abbreviations[prefix] = full
        # for code in codes:
        #     code_abbreviations[code] = full

    return code_abbreviations


def indicator_groups():
    """generator for returning groups of indicators to make datasets from"""

    with open("indicator_groups.json", "r") as f:
        groups = json.load(f)

    for name, group in groups.items():

        yield name, group


def gadm_country_lookup(country_code, countries):
    try:
        return countries.loc[
            countries["Alpha-3_Code"] == country_code, "country_name"
        ].iloc[0]
    except Exception as e:
        print(f"error with gadm lookup {e}- {country_code}")


def make_dataset(df, country_codes, countries):
    # columns = ['timestamp', 'country', 'admin1', 'admin2', 'admin3', 'lat', 'lng', 'feature', 'value']

    # year strings and timestamps (in milliseconds) from 1960 to 2021
    years = [
        (f"{year}", datetime(year, 1, 1, tzinfo=timezone.utc).timestamp() * 1000)
        for year in range(1960, 2022)
    ]

    rows = []
    # feature_codes = set(df['Indicator Code'].tolist())
    for _, row in tqdm(df.iterrows(), total=len(df), desc="Making rows", leave=False):
        # filter out rows that are not countries
        if row["Country Code"] not in country_codes:
            continue
        for year, timestamp in years:
            rows.append(
                {
                    "timestamp": timestamp,
                    "country": gadm_country_lookup(row["Country Code"], countries),
                    "admin1": None,
                    "admin2": None,
                    "admin3": None,
                    "lat": None,
                    "lng": None,
                    "feature": row[
                        "Indicator Code"
                    ],  # Indicator Name will go in the description
                    "value": row[year],
                }
            )

    # print(f' need thsee {all_countries}')

    df = pd.DataFrame(rows)
    return df


def optimize_df_types(df: pd.DataFrame):
    """
    Pandas will upcast essentially everything. This will use the built-in
    Pandas function to_numeeric to downcast dataframe series to types that use
    less memory e.g. float64 to float32.
    For very large dataframes the memory reduction should translate into
    increased efficieny.
    """
    floats = df.select_dtypes(include=["float64"]).columns.tolist()
    df[floats] = df[floats].apply(pd.to_numeric, downcast="float")

    ints = df.select_dtypes(include=["int64"]).columns.tolist()
    df[ints] = df[ints].apply(pd.to_numeric, downcast="integer")

    # for col in df.select_dtypes(include=['object']):
    #    num_unique_values = len(df[col].unique())
    #    num_total_values = len(df[col])
    #    if float(num_unique_values) / num_total_values < 0.5:
    #        df[col] = df[col].astype('category')

    return


def save_parquet(df, name):
    filename = f"{name}.parquet.gzip"
    # optimize data types for storage
    optimize_df_types(df)
    # save a parquet file
    df.to_parquet(f"output/{filename}", compression="gzip")


def make_metadata(df, series_info, name, description):
    # get the min and max timestamps
    min_timestamp = df["timestamp"].min()
    max_timestamp = df["timestamp"].max()
    id = str(uuid4())

    features = df["feature"].unique().tolist()
    countries = df["country"].unique().tolist()

    # create a map from the feature name to the row in series_info['Indicator Name'] == feature name
    feature_map = {
        feature: dict(series_info[series_info["Series Code"] == feature].iloc[0])
        for feature in features
    }

    def get_description(info: dict) -> str:
        ret = info.get("Long definition", None)
        if pd.isnull(ret):
            ret = info.get("Short definition", None)
        if pd.isnull(ret):
            ret = info.get("Indicator Name")
        if pd.isnull(ret):
            ret = ""
        return ret

    def get_unit(info) -> str:
        unit = None
        try:
            # sometimes units are at the end of the indicator name (e.g. 'GDP (current US$)')
            name: str = info["Indicator Name"]
            if name.endswith(")"):
                unit = name[name.rfind("(") + 1 : -1]
        except:
            unit = None
        if unit is None:
            unit = info.get("Unit of measure", None)
        if pd.isnull(unit):
            unit = "NA"
        return unit

    def get_unit_description(info) -> str:
        return get_unit(info)  # no other source of info for this

    meta = {
        "id": id,
        "name": name,
        "family_name": None,
        "description": description,
        "created_at": datetime.now(timezone.utc).timestamp() * 1000,
        "category": None,
        "domains": ["Economic Sciences"],
        "maintainer": {
            "name": "David Samson",
            "email": "david@jataware.com",
            "organization": "Jataware",
            "website": "http://databank.worldbank.org/data/download/WDI_csv.zip",
        },
        "data_paths": None,
        "outputs": [
            {
                "name": feature,
                "display_name": info["Indicator Name"],
                "description": get_description(info),
                "type": "float",  # TODO: maybe check the datatype in df?
                "unit": get_unit(info),
                "unit_description": get_unit_description(info),
                "ontologies": {"concepts": [], "processes": [], "properties": []},
                "is_primary": True,
                "data_resolution": {
                    "temporal_resolution": "annual",
                    "spatial_resolution": [0, 0],
                },
                "alias": {},
            }
            for feature, info in feature_map.items()
        ],
        "qualifier_outputs": [
            {
                "name": "timestamp",
                "display_name": "timestamp",
                "description": "timestamp",
                "type": "datetime",
                "unit": "ms",
                "unit_description": "milliseconds since January 1, 1970",
                "ontologies": {"concepts": [], "processes": [], "properties": []},
                "related_features": [],
            },
            {
                "name": "country",
                "display_name": "country",
                "description": "country",
                "type": "country",
                "unit": None,
                "unit_description": None,
                "ontologies": {"concepts": [], "processes": [], "properties": []},
                "related_features": [],
            },
        ],
        "tags": [],
        "geography": {"country": countries, "admin1": [], "admin2": [], "admin3": []},
        "period": {"gte": min_timestamp, "lte": max_timestamp},
        "deprecated": False,
        "data_sensitivity": "",
        "data_quality": "",
        "published": True,
    }

    return meta


code_abbreviations = {
    "EG": "",
    "FX": "",
    "SE": "",
    "PRM": "",
    "NY": "",
    "SP": "",
    "SEC": "",
    "SH": "",
    "HIV": "",
    "AG": "",
    "EN": "",
    "TX": "",
    "TM": "",
    "NV": "",
    "IS": "",
    "ER": "",
    "SI": "",
    "STA": "",
    "MS": "",
    "FB": "",
    "IC": "",
    "SL": "",
    "TLF": "",
    "FD": "",
    "VC": "",
    "FM": "",
    "DTH": "",
    "GC": "",
    "NE": "",
    "BM": "",
    "BX": "",
    "AGR": "",
    "MNF": "",
    "SRV": "",
    "SLF": "",
    "FAM": "",
    "WAG": "",
    "MLR": "",
    "FS": "",
    "DT": "",
    "MED": "",
    "COM": "",
    "CON": "",
    "FP": "",
    "SN": "",
    "IQ": "",
    "BN": "",
    "XPD": "",
    "PA": "",
    "FPL": "",
    "FR": "",
    "TER": "",
    "EMP": "",
    "IND": "",
    "IT": "",
    "GDP": "",
    "HD": "",
    "IMM": "",
    "TBS": "",
    "UHC": "",
    "IP": "",
    "SM": "",
    "ST": "",
    "IE": "",
    "LP": "",
    "MMR": "",
    "CM": "",
    "ADT": "",
    "TG": "",
    "DYN": "",
    "TT": "",
    "DC": "",
    "VAC": "",
    "SGR": "",
    "H2O": "",
    "PRE": "",
    "ANM": "",
    "PRG": "",
    "PRV": "",
    "SVR": "",
    "GF": "",
    "SG": "",
    "EP": "",
    "PX": "",
    "GB": "",
    "ENR": "",
    "UEM": "",
    "ALC": "",
    "FI": "",
    "BG": "",
}


def current_milli_time():
    return round(time.time() * 1000)


def save_meta_es(meta):
    # open json and validate
    # meta_check=pydantic.parse_file_as(path=f'output/{name}_meta.json', type_=IndicatorMetadataSchema)
    meta["created_at"] = current_milli_time()
    print(f'id {meta.get("id")}')
    resp = es.index(index="indicators", body=meta, id=meta.get("id"))
    print(resp)


def upload_files_to_s3(id, name, args):
    with open(f"output/{name}.parquet.gzip", "rb") as f:
        s3.upload_fileobj(f, f"{args.bucket}", f"datasets/{id}/{id}.parquet.gzip")
    with open(f"output/{name}.csv", "rb") as f:
        s3.upload_fileobj(f, f"{args.bucket}", f"datasets/{id}/raw_data.csv")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--es", help="Elasticsearch connection string")
    parser.add_argument("--bucket", help="S3 bucket to save to")
    parser.add_argument("--aws_key", help="aws_key")
    parser.add_argument("--aws_secret", help="aws_secret")
    args = parser.parse_args()

    ELASTICSEARCH_URL = args.es
    es = Elasticsearch([ELASTICSEARCH_URL])

    s3 = boto3.client(
        "s3", aws_access_key_id=args.aws_key, aws_secret_access_key=args.aws_secret
    )
    populate_wdi_data(args)
