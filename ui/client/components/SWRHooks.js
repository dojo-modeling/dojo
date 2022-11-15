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

// Datasets were previously called indicators, and this has not yet been updated in dojo
export function useDataset(datasetId) {
  const { data, error, mutate } = useSWR(
    datasetId ? `/api/dojo/indicators/${datasetId}` : null, fetcher
  );

  return {
    dataset: data,
    datasetLoading: !error && !data,
    datasetError: error,
    mutateDataset: mutate,
  };
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

export function useShellHistory(modelId) {
  const { data, error, mutate } = useSWR(
    modelId ? `/api/dojo/terminal/container/history/${modelId}` : null, fetcher
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

export function useRun(runId) {
  const {
    data, error, mutate
  } = useSWR(
    runId ? `/api/dojo/runs/${runId}` : null, fetcher
  );

  return {
    run: data,
    runLoading: !data && !error,
    runError: error,
    mutateRun: mutate
  };
}

export function useLocks() {
  const { data, error, mutate } = useSWR('/api/terminal/docker/locks', fetcher);

  // we only use the locks property inside the object here
  return {
    locks: data?.locks,
    locksLoading: !error && !data,
    locksError: error,
    mutateLocks: mutate,
  };
}

export function useLock(modelId) {
  const lockFetcher = async (url) => {
    const response = await fetch(url);
    const parsedResponse = await response.json();

    if (!response.ok) {
      const error = new Error(`Error fetching data from ${url}`);
      error.info = parsedResponse;
      error.status = response.status;
      throw error;
    }

    if (parsedResponse.containerId === 'unset' || !parsedResponse.containerId.length) {
      const error = new Error(`No container lock found for model ${modelId}`);
      throw error;
    }

    return parsedResponse;
  };

  // use this custom fetcher because we also want to throw an error when containerId is 'unset'
  const { data, error } = useSWR(
    `/api/terminal/docker/locks/${modelId}`, lockFetcher
  );

  return {
    lock: data,
    lockLoading: !error && !data,
    lockError: error,
  };
}

export function useNodes() {
  const { data, error, mutate } = useSWR('/api/terminal/docker/nodes?v', fetcher);

  return {
    nodes: data,
    nodesLoading: !error && !data,
    nodesError: error,
    mutateNodes: mutate,
  };
}

export function useParams(modelId) {
  const { data, error } = useSWR(`/api/dojo/dojo/parameters/${modelId}`, fetcher);

  return {
    params: data,
    paramsLoading: !error && !data,
    paramsError: error,
  };
}
