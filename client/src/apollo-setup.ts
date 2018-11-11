import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";
import { ApolloLink, NextLink } from "apollo-link";
import { Operation } from "apollo-link";
import { onError } from "apollo-link-error";
import { HttpLink } from "apollo-link-http";
import { CachePersistor } from "apollo-cache-persist";

import { initState } from "./state";
import { getToken } from "./state";
import getBackendUrls from "./get-backend-urls";

const HTTP_URL = getBackendUrls().apiUrl;

let httpLink;
httpLink = new HttpLink({ uri: HTTP_URL }) as ApolloLink;
httpLink = middlewareAuthLink().concat(httpLink);
httpLink = middlewareErrorLink().concat(httpLink);

if (process.env.NODE_ENV !== "production") {
  httpLink = middlewareLoggerLink(httpLink);
}

const cache = new InMemoryCache();

export const client = new ApolloClient({
  cache,
  link: ApolloLink.from([initState(cache), httpLink])
});

export default client;

export async function persistCache() {
  const persistor = new CachePersistor({
    cache,
    storage: localStorage,
    key: "thysis-apollo-cache-persist"
  });

  const SCHEMA_VERSION = "2"; // Must be a string.
  const SCHEMA_VERSION_KEY = "thysis-apollo-schema-version";
  const currentVersion = localStorage.getItem(SCHEMA_VERSION_KEY);

  if (currentVersion === SCHEMA_VERSION) {
    // If the current version matches the latest version,
    // we're good to go and can restore the cache.
    await persistor.restore();
  } else {
    // Otherwise, we'll want to purge the outdated persisted cache
    // and mark ourselves as having updated to the latest version.
    await persistor.purge();
    localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION);
  }

  return persistor;
}

// HELPER FUNCTIONS

function middlewareAuthLink() {
  return new ApolloLink((operation, forward) => {
    const token = getToken();

    if (token) {
      operation.setContext({
        headers: {
          authorization: `Bearer ${token}`
        }
      });
    }

    return forward ? forward(operation) : null;
  });
}

const getNow = () => {
  const n = new Date();
  return `${n.getHours()}:${n.getMinutes()}:${n.getSeconds()}`;
};

function middlewareLoggerLink(l: ApolloLink) {
  const processOperation = (operation: Operation) => ({
    query: operation.query.loc ? operation.query.loc.source.body : {},
    variables: operation.variables
  });

  const logger = new ApolloLink((operation, forward: NextLink) => {
    const operationName = `Apollo operation: ${operation.operationName}`;

    // tslint:disable-next-line:no-console
    console.log(
      "\n\n\n",
      getNow(),
      `=============================${operationName}========================\n`,
      processOperation(operation),
      `\n=========================End ${operationName}=========================`
    );

    if (!forward) {
      return forward;
    }

    const fop = forward(operation);

    if (fop.map) {
      return fop.map(response => {
        // tslint:disable-next-line:no-console
        console.log(
          "\n\n\n",
          getNow(),
          `==============Received response from ${operationName}============\n`,
          response,
          `\n==========End Received response from ${operationName}=============`
        );
        return response;
      });
    }

    return fop;
  });

  return logger.concat(l);
}

function middlewareErrorLink() {
  return onError(({ graphQLErrors, networkError, response, operation }) => {
    // tslint:disable-next-line:ban-types
    const logError = (errorName: string, obj: Object) => {
      if (process.env.NODE_ENV === "production") {
        return;
      }

      const operationName = `[${errorName} error] from Apollo operation: ${
        operation.operationName
      }`;

      // tslint:disable-next-line:no-console
      console.error(
        "\n\n\n",
        getNow(),
        `============================${operationName}=======================\n`,
        obj,
        `\n====================End ${operationName}============================`
      );
    };

    if (response) {
      logError("Response", response);
    }

    if (networkError) {
      logError("Network", networkError);
    }
  });
}
