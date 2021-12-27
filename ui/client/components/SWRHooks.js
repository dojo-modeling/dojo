import useSWR from 'swr';

const fetcher = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error(`Error fetching data from ${url}`);
    error.info = await response.json();
    error.status = response.status;
    throw error;
  }

  return response.json();
};

export function useModel(modelId) {
  const { data, error, mutate } = useSWR(modelId ? `/api/dojo/models/${modelId}` : null, fetcher);

  return {
    model: data,
    modelLoading: !error && !data,
    modelError: error,
    mutateModel: mutate,
  };
}

export function useContainer(containerId) {
  const { data, error, mutate } = useSWR(
    containerId ? `/api/dojo/terminal/container/${containerId}` : null, fetcher
  );

  return {
    container: data,
    mutateContainer: mutate,
    containerLoading: !error && !data,
    containerError: error,
  };
}

export function useContainerWithWorker(workerNode) {
  // fetch the container ID first
  const { data: containerId } = useSWR(
    workerNode ? `/api/terminal/container/${workerNode}/ops/container` : null, fetcher
  );

  // then fetch the container (SWR handles this nicely)
  return useContainer(containerId?.id);
}

export function useConfigs(modelId) {
  const { data, error, mutate } = useSWR(
    modelId ? `/api/dojo/dojo/config/${modelId}` : null, fetcher
  );

  return {
    configs: data,
    configsLoading: !error && !data,
    configsError: error,
    mutateConfigs: mutate,
  };
}

export function useOutputFiles(modelId) {
  const { data, error, mutate } = useSWR(
    modelId ? `/api/dojo/dojo/outputfile/${modelId}` : null, fetcher
  );

  return {
    outputs: data,
    outputsLoading: !error && !data,
    outputsError: error,
    mutateOutputs: mutate,
  };
}

export function useAccessories(modelId) {
  const { data, error, mutate } = useSWR(
    modelId ? `/api/dojo/dojo/accessories/${modelId}` : null, fetcher
  );

  return {
    accessories: data,
    mutateAccessories: mutate,
    accessoriesLoading: !error && !data,
    accessoriesError: error,
  };
}

export function useDirective(modelId) {
  const { data, error, mutate } = useSWR(
    modelId ? `/api/dojo/dojo/directive/${modelId}` : null, fetcher, { shouldRetryOnError: false }
  );

  return {
    directive: data,
    directiveLoading: !error && !data,
    directiveError: error,
    mutateDirective: mutate,
  };
}

export function useShellHistory(containerId) {
  const { data, error, mutate } = useSWR(
    containerId ? `/api/dojo/terminal/container/${containerId}/history` : null, fetcher
  );

  return {
    shellHistory: data,
    shellHistoryLoading: !error && !data,
    shellHistoryError: error,
    mutateShellHistory: mutate,
  };
}

export function useRunLogs(runId) {
  const { data, error, mutate } = useSWR(
    runId ? `/api/dojo/runs/${runId}/logs` : null, fetcher
  );

  return {
    runLogs: data,
    runLogsLoading: !error && !data,
    runLogsError: error,
    mutateRunLogs: mutate,
  };
}
