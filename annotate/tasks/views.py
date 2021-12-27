import logging

from django.shortcuts import render
from django.views import View
from django.http import JsonResponse
from django_rq.workers import Worker
from django_rq.jobs import Job
from django_redis import get_redis_connection
from rq.exceptions import NoSuchJobError


def get_job_by_func(task_function, args):
    workers = Worker.all(get_redis_connection())
    running_jobs = [worker.get_current_job() for worker in workers]
    for job in running_jobs:
        if (
                job is not None
                and job.func_name == f"{task_function.__module__}.{task_function.__name__}" and job.args == args
        ):
            return job
    return None


def get_job_by_id(job_id):
    try:
        return Job.fetch(job_id, connection=get_redis_connection())
    except NoSuchJobError:
        return None


class TaskView(View):
    task_name = None
    completion_url = None
    task_function = None
    task_status_url = None
    polling_frequency_seconds = 1

    def get(self, request, uuid=None):
        # Check if task is already running for that UUID, don't rerun if it is, just wait for completion.
        job = get_job_by_func(self.task_function, args=(uuid,))
        if not job:
            job = self.task_function.delay(uuid)

        reformat_mapping = {
            "uuid": uuid,
            "job_id": job.id,
            "req_path": request.path
        }

        context = {
            "polling_frequency_seconds": str(self.polling_frequency_seconds),
            "completion_url": self.completion_url,
            "task_name": self.task_name,
            "uuid": uuid,
            "task_status_url": self.task_status_url,
            "job_id": job.id,
        }
        # Any of the context values could have the uuid or job_id as a templated variable. Resolve it before passing.
        context = {name: value.format(**reformat_mapping) for name, value in context.items()}
        return render(request, "tasks/loading.html", context=context)


class TaskStatusView(View):
    def get(self, request, uuid):
        job_status = None
        job_error = None
        job_id = request.GET.get('job_id')
        if job_id:
            job = get_job_by_id(job_id)
            if job is not None:
                job_status = job.get_status()
                if job_status == "failed":
                    job_error = job.exc_info
        done = self.is_done(request, uuid)
        if job_error is not None:
            logging.error(job_error)
        return JsonResponse({
            "isDone": done,
            "isFailed": job_status == "failed",
            "jobStatus": job_status,
            "jobError": job_error,
        })

    def is_done(self, request, uuid):
        return NotImplementedError()
