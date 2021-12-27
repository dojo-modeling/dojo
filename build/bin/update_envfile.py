import argparse
import re
import shutil
import sys


def update_files(
    sample_envfile_name,
    envfile_name,
    backup_envfile=True,
    bypass_prompt=False,
    quiet=False,
):

    with open(sample_envfile_name) as sample_envfile:
        sample_items = dict(
            re.split(r"\s*=\s*", line.strip(), 1) for line in sample_envfile
        )
    with open(envfile_name) as envfile:
        env_items = dict(re.split(r"\s*=\s*", line.strip(), 1) for line in envfile)

    missing_keys = set(sample_items.keys()) - set(env_items.keys())
    if missing_keys:
        if not quiet:
            print(
                "The following default keys exist in the envfile.sample file but not in envfile:\n"
            )
            for missing_key in sorted(missing_keys):
                print(f"{missing_key}={sample_items[missing_key]}")

        if not (quiet or bypass_prompt):
            response = None
            reprompt = True
            while reprompt:
                response = (
                    input(
                        "\nShould these be automatically added to your envfile? [Y,n] "
                    )
                    .strip()
                    .lower()
                )
                reprompt = not (response == "" or response in "yn")

            if response == "n":
                sys.exit(0)

        for missing_key in missing_keys:

            env_items[missing_key] = sample_items[missing_key]

        if backup_envfile:
            shutil.copy(envfile_name, f".{envfile_name}.bak")

        with open(envfile_name, "w") as envfile:
            for key, value in env_items.items():
                envfile.write(f"{key}={value}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Updates one envfile based another. Finds variables in the source file that doesn't exist in the "
                    "destination and optionally updates the destination with the values from the source."
    )
    parser.add_argument("source_envfile", help="Source checked for new variables")
    parser.add_argument("dest_envfile", help="File that needs to be updated")
    parser.add_argument("-y", dest="yes", action="store_true", help="No prompting")
    parser.add_argument("-q", dest="quiet", action="store_true", help="No output, no prompting")
    parser.add_argument("--no-backup", action="store_false", help="Skip backing up the destination envfile")
    args = parser.parse_args()

    update_files(
        args.source_envfile,
        args.dest_envfile,
        backup_envfile=args.no_backup,
        bypass_prompt=args.yes,
        quiet=args.quiet,
    )
