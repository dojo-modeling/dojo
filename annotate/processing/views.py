import os
from tasks.views import TaskView, TaskStatusView
from .file_processors import FileLoadProcessor
from .submission_processors import SubmissionProcessor


class PreProcessing(TaskView):
    """processors before the annotation table after metadata collection"""

    from processing.geotime_processors import GeotimeProcessor
    from processing.file_processors import FileLoadProcessor, SaveProcessorCsv

    task_functions = [FileLoadProcessor, SaveProcessorCsv, GeotimeProcessor]
    task_status_url = "status?job_id={job_id}"
    task_name = "analyze"
    completion_url = "../../overview/{uuid}"


class PreProcessingStatus(TaskStatusView):
    def is_done(self, request, uuid):
        done = os.path.exists(f"data/{uuid}/geotime_classification.json")
        return done


class PreviewLoader(TaskView):
    """after annotations have been collected processors for generating review table"""

    from processing.file_processors import FileLoadProcessor
    from processing.mixmasta_processors import MixmastaFileGenerator, MixmastaProcessor

    task_functions = [FileLoadProcessor, MixmastaFileGenerator, MixmastaProcessor]
    task_status_url = "status?job_id={job_id}"
    task_name = "preview"
    completion_url = "../../../overview/submit/{uuid}"


class PreviewStatus(TaskStatusView):
    def is_done(self, request, uuid):
        done = bool(
            os.path.exists(f"data/{uuid}/mixmasta_processed_df.csv")
            and not os.path.exists(f"data/{uuid}/mixmasta_processed_writing")
        )
        return done


class SubmissionProcessing(TaskView):
    """submission steps"""

    task_functions = [FileLoadProcessor, SubmissionProcessor]
    task_status_url = "status?job_id={job_id}"
    task_name = "submission"
    error_url = "submission_error"
    completion_url = "done"


class SubmissionStatus(TaskStatusView):
    def is_done(self, request, uuid):
        return os.path.exists(f"data/{uuid}/finished")

    def is_error(self, request, uuid):
        return os.path.exists(f"data/{uuid}/error")


class PreviewLoader(TaskView):
    """after annotations have been collected processors for generating review table"""

    from processing.file_processors import FileLoadProcessor
    from processing.mixmasta_processors import MixmastaFileGenerator, MixmastaProcessor

    task_functions = [FileLoadProcessor, MixmastaFileGenerator, MixmastaProcessor]
    task_status_url = "status?job_id={job_id}"
    task_name = "preview"
    completion_url = "../../../overview/submit/{uuid}"


class PreviewStatus(TaskStatusView):
    def is_done(self, request, uuid):
        done = bool(
            os.path.exists(f"data/{uuid}/mixmasta_processed_df.csv")
            and not os.path.exists(f"data/{uuid}/mixmasta_processed_writing")
        )
        return done
