import json
from typing import Optional

from airflow.operators.docker_operator import DockerOperator

class DojoDockerOperator(DockerOperator):
    template_fields = ('image', 'command', 'environment', 'container_name', 'volumes')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        print(self.volumes)

    def execute(self, context) -> Optional[str]:
        # Handle volume mount
        if isinstance(self.volumes, str):
            self.volumes = json.loads(self.volumes)            
            print(self.volumes)

        self.cli = self._get_cli()
        if not self.cli:
            raise Exception("The 'cli' should be initialized before!")

        # Pull the docker image if `force_pull` is set or image does not exist locally
        # pylint: disable=too-many-nested-blocks
        if self.force_pull or not self.cli.images(name=self.image):
            self.log.info('Pulling docker image %s', self.image)
            latest_status = {}
            for output in self.cli.pull(self.image, stream=True, decode=True):
                if isinstance(output, str):
                    self.log.info("%s", output)
                    continue
                if isinstance(output, dict) and 'status' in output:
                    output_status = output["status"]
                    if 'id' not in output:
                        self.log.info("%s", output_status)
                        continue

                    output_id = output["id"]
                    if latest_status.get(output_id) != output_status:
                        self.log.info("%s: %s", output_id, output_status)
                        latest_status[output_id] = output_status

        self.environment['AIRFLOW_TMP_DIR'] = self.tmp_dir
        return self._run_image()
