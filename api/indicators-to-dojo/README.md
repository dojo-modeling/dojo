## ISI Datamart Indicators to Dojo


### Set-up:

1. Export your AWS credentials as environmental variables:

	```
	export AWS_ACCESS_KEY=<HERE>
	export AWS_SECRET_KEY=<HERE>
	```

2. Have a local instance of Dojo running __*OR*__ update the url in the `indicator_to_dojo.py` script.


### Run:

```
python3 indicators_to_dojo.py
```

This will:

1. Download the compressed datamart indicator json file `s3_jsons.gz` from S3.
2. Decompress `s3_jsons.gz` then delete the `.gz` file.
3. For each indicator json in the `s3_jsons` folder: Post the json to the indicators endpoint (as assigned in the script url)

__NOTE__: There are two methods to run this script.

1. Testing Mode: Slices small numbers of jsons to verify the code (this is what is committed)
2. Prod Mode: Uncomment the code under `PROD MODE` and comment out the `TESTING MODE` to run thru all datamart indicators. This mode will also delete all jsons and their folder after completion

