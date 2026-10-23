<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import {
    ArrowLeft,
    ArrowRight,
    Check,
    CircleAlert,
    Copy,
    LoaderCircle,
    MonitorSmartphone,
    Server,
  } from "@lucide/svelte";
  import Button from "$lib/components/button/Button.svelte";
  import Card from "$lib/components/card/Card.svelte";
  import Input from "$lib/components/input/Input.svelte";
  import Brand from "$lib/components/layout/Brand.svelte";
  import Field from "$lib/components/ui/Field.svelte";
  import {
    checkServer,
    createToken,
    DEFAULT_PORT,
    errorMessage,
    normalizeServerUrl,
    saveConnection,
    serverUrlFrom,
  } from "$lib/connection";

  type ServerInfo = {
    ip: string | null;
    port: number;
  };

  type Step = "role" | "main" | "client";

  let step = $state<Step>("role");
  let tillName = $state("Main till");
  let tillCode = $state("T1");
  let mainToken = $state(createToken());
  let clientToken = $state("");
  let addressInput = $state("");
  let busy = $state(false);
  let loadingAddress = $state(false);
  let error = $state<string | null>(null);
  let addressError = $state<string | null>(null);
  let lanInfo = $state<ServerInfo | null>(null);
  let copied = $state<string | null>(null);

  const hasBridge =
    typeof window !== "undefined" &&
    typeof (
      globalThis as { __TAURI_INTERNALS__?: { invoke?: unknown } }
    ).__TAURI_INTERNALS__?.invoke === "function";

  const address = $derived(
    lanInfo?.ip ? serverUrlFrom(lanInfo.ip, lanInfo.port) : "",
  );

  function choose(role: "main" | "client") {
    step = role;
    error = null;

    if (role === "main") {
      if (tillName === "Till 2" && tillCode === "T2") {
        tillName = "Main till";
        tillCode = "T1";
      }
      void loadAddress();
    } else if (tillName === "Main till" && tillCode === "T1") {
      tillName = "Till 2";
      tillCode = "T2";
    }
  }

  async function loadAddress() {
    if (!hasBridge) {
      addressError =
        "Open this screen in the Posh desktop app to run the main till.";
      return;
    }

    loadingAddress = true;
    addressError = null;

    try {
      lanInfo = await invoke<ServerInfo>("lan_info", { port: DEFAULT_PORT });
    } catch (cause) {
      addressError = errorMessage(cause);
    } finally {
      loadingAddress = false;
    }
  }

  async function copy(value: string, key: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      copied = key;
      setTimeout(() => {
        if (copied === key) copied = null;
      }, 2_000);
    } catch {
      error = "Could not copy. Select the text and copy it by hand.";
    }
  }

  function validateTill(): boolean {
    if (!tillName.trim()) {
      error = "Give this till a name, for example Front counter.";
      return false;
    }
    if (!/^[A-Za-z0-9]{1,4}$/.test(tillCode.trim())) {
      error = "The till code must be 1–4 letters or numbers, like T1.";
      return false;
    }
    return true;
  }

  async function startMain() {
    if (busy || !validateTill()) return;
    if (!hasBridge) {
      error = "The main till must run in the Posh desktop app.";
      return;
    }

    error = null;
    busy = true;

    try {
      const info = await invoke<ServerInfo>("start_lan_server", {
        token: mainToken,
        port: DEFAULT_PORT,
      });

      try {
        saveConnection({
          role: "main",
          tillName,
          tillCode,
          serverUrl: serverUrlFrom(info.ip, info.port),
          token: mainToken,
          port: info.port,
        });
      } catch (cause) {
        await invoke("stop_lan_server").catch(() => {});
        throw cause;
      }

      window.location.assign("/");
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }

  async function startClient() {
    if (busy || !validateTill()) return;

    const token = clientToken.trim();
    if (token.length < 8) {
      error = "Paste the token shown on the main till.";
      return;
    }

    error = null;
    busy = true;

    try {
      const serverUrl = normalizeServerUrl(addressInput, DEFAULT_PORT);
      await checkServer({ serverUrl, token });

      saveConnection({
        role: "client",
        tillName,
        tillCode,
        serverUrl,
        token,
        port: DEFAULT_PORT,
      });

      window.location.assign("/");
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex min-h-dvh flex-col bg-canvas-soft">
  <header class="flex h-11 shrink-0 items-center border-b border-chrome-line bg-chrome px-3">
    <Brand />
    <span class="ms-auto text-micro-cap uppercase tracking-wide text-chrome-mute">
      First run
    </span>
  </header>

  <main class="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
    {#if step === "role"}
      <div class="w-full max-w-2xl">
        <p class="eyebrow text-ink-mute">Set up this computer</p>
        <h1 class="mt-2 text-heading-lg text-ink">How will this till work?</h1>
        <p class="mt-2 max-w-xl text-body-md text-ink-mute">
          Every till runs the same app. One computer keeps the products and
          orders; the others send their sales to it over the shop network.
        </p>

        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            class="group flex min-h-56 flex-col rounded-lg border border-hairline bg-canvas p-5 text-left transition-colors hover:border-primary hover:bg-primary-subdued/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onclick={() => choose("main")}
          >
            <span class="flex items-center justify-between">
              <span
                class="flex size-10 items-center justify-center rounded-md bg-chrome text-chrome-ink"
              >
                <Server class="size-5" />
              </span>
              <span class="text-micro-cap uppercase tracking-wide text-ink-faint">
                01
              </span>
            </span>
            <span class="mt-4 text-heading-sm text-ink">Main till</span>
            <span class="mt-1.5 text-body-md text-ink-mute">
              Keeps the shop's products, prices and orders. It should stay on
              while the shop is trading.
            </span>
            <span
              class="mt-auto inline-flex items-center gap-1.5 pt-5 text-button-sm text-primary"
            >
              Choose main till
              <ArrowRight
                class="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </button>

          <button
            type="button"
            class="group flex min-h-56 flex-col rounded-lg border border-hairline bg-canvas p-5 text-left transition-colors hover:border-primary hover:bg-primary-subdued/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onclick={() => choose("client")}
          >
            <span class="flex items-center justify-between">
              <span
                class="flex size-10 items-center justify-center rounded-md bg-canvas-sunken text-ink ring-1 ring-hairline ring-inset"
              >
                <MonitorSmartphone class="size-5" />
              </span>
              <span class="text-micro-cap uppercase tracking-wide text-ink-faint">
                02
              </span>
            </span>
            <span class="mt-4 text-heading-sm text-ink">Client till</span>
            <span class="mt-1.5 text-body-md text-ink-mute">
              Sends every sale to the main till. Needs the main till's address
              and token, and must be on the same network.
            </span>
            <span
              class="mt-auto inline-flex items-center gap-1.5 pt-5 text-button-sm text-primary"
            >
              Choose client till
              <ArrowRight
                class="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </button>
        </div>

        <p class="mt-4 text-caption text-ink-mute">
          You can change this later in Settings. Sales pause on a client when
          the main till cannot be reached.
        </p>
      </div>
    {:else}
      <div class="w-full max-w-xl">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-sm text-button-sm text-ink-secondary transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onclick={() => {
            step = "role";
            error = null;
          }}
        >
          <ArrowLeft class="size-4" />
          Back
        </button>

        <p class="eyebrow mt-6 text-ink-mute">
          {step === "main" ? "Main till" : "Client till"}
        </p>
        <h1 class="mt-2 text-heading-lg text-ink">
          {step === "main" ? "Set up the shop's main till" : "Connect to the main till"}
        </h1>
        <p class="mt-2 text-body-md text-ink-mute">
          {#if step === "main"}
            This computer will keep the database and serve the other tills.
          {:else}
            Enter the address and token shown on the main till.
          {/if}
        </p>

        <Card class="mt-6" padding="lg">
          <div class="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field
              label="Till name"
              for="setup-till-name"
              hint="Shown on orders; unique to this till."
            >
              <Input
                id="setup-till-name"
                bind:value={tillName}
                placeholder="Front counter"
                autocomplete="off"
                maxlength="40"
              />
            </Field>
            <Field
              label="Till code"
              for="setup-till-code"
              hint="1–4 characters, unique to this till."
            >
              <Input
                id="setup-till-code"
                bind:value={tillCode}
                placeholder="T1"
                class="font-mono uppercase"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
                maxlength="4"
              />
            </Field>
          </div>

          {#if step === "client"}
            <div class="mt-5 space-y-4 border-t border-hairline pt-5">
              <Field
                label="Main till address"
                for="setup-address"
                hint="For example 192.168.1.5:47821."
              >
                <Input
                  id="setup-address"
                  bind:value={addressInput}
                  placeholder="192.168.1.5:47821"
                  class="font-mono"
                  autocomplete="off"
                  autocapitalize="off"
                  spellcheck="false"
                  inputmode="url"
                />
              </Field>

              <Field
                label="Till token"
                for="setup-token"
                hint="Copy it from the main till's setup screen or Settings."
              >
                <Input
                  id="setup-token"
                  bind:value={clientToken}
                  placeholder="12-character token"
                  class="font-mono uppercase"
                  autocomplete="off"
                  autocapitalize="off"
                  spellcheck="false"
                  maxlength="64"
                />
              </Field>
            </div>

            <p class="mt-5 rounded-md bg-canvas-soft p-3 text-caption text-ink-mute">
              Both tills must be on the same WiFi or LAN. The main till must be
              open for this till to sell.
            </p>
          {:else}
            <div class="mt-5 border-t border-hairline pt-5">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-heading-sm text-ink">Share with the client tills</p>
                  <p class="mt-1 text-caption text-ink-mute">
                    Type these two values into each client till's first run.
                  </p>
                </div>
                {#if loadingAddress}
                  <span class="inline-flex items-center gap-1.5 text-caption text-ink-mute">
                    <LoaderCircle class="size-3.5 animate-spin" />
                    Finding address
                  </span>
                {/if}
              </div>

              <dl class="mt-4 space-y-3 rounded-md bg-canvas-soft p-3">
                <div>
                  <dt class="eyebrow text-ink-faint">Address</dt>
                  <dd class="mt-1 flex items-center gap-2">
                    <code
                      class="min-w-0 flex-1 truncate font-mono text-body-md text-ink"
                    >
                      {address || "No network address found"}
                    </code>
                    <button
                      type="button"
                      class="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-ink-mute transition-colors hover:bg-canvas-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40"
                      aria-label="Copy main till address"
                      title="Copy address"
                      disabled={!address}
                      onclick={() => copy(address, "address")}
                    >
                      {#if copied === "address"}
                        <Check class="size-4 text-success" />
                      {:else}
                        <Copy class="size-4" />
                      {/if}
                    </button>
                  </dd>
                </div>

                <div>
                  <dt class="eyebrow text-ink-faint">Token</dt>
                  <dd class="mt-1 flex items-center gap-2">
                    <code
                      class="min-w-0 flex-1 truncate font-mono text-body-md text-ink"
                    >
                      {mainToken}
                    </code>
                    <button
                      type="button"
                      class="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-ink-mute transition-colors hover:bg-canvas-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      aria-label="Copy till token"
                      title="Copy token"
                      onclick={() => copy(mainToken, "token")}
                    >
                      {#if copied === "token"}
                        <Check class="size-4 text-success" />
                      {:else}
                        <Copy class="size-4" />
                      {/if}
                    </button>
                  </dd>
                </div>
              </dl>

              {#if addressError}
                <p class="mt-3 flex items-start gap-2 text-caption text-danger" role="alert">
                  <CircleAlert class="mt-0.5 size-3.5 shrink-0" />
                  {addressError}
                </p>
              {:else if lanInfo && !lanInfo.ip}
                <p class="mt-3 flex items-start gap-2 text-caption text-danger" role="alert">
                  <CircleAlert class="mt-0.5 size-3.5 shrink-0" />
                  No network address was found. Connect this computer to the
                  shop's WiFi or LAN before the client tills can connect.
                </p>
              {/if}
            </div>

            <p class="mt-5 text-caption text-ink-mute">
              Keep the token inside the shop. Anyone with this address and token
              can use this till's database. The connection is not encrypted, so
              do not expose port 47821 to the internet.
            </p>
          {/if}

          {#if error}
            <p
              class="mt-4 flex items-start gap-2 rounded-md border border-danger/25 bg-danger/5 p-3 text-body-md text-danger"
              role="alert"
            >
              <CircleAlert class="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          {/if}

          <div class="mt-6 flex flex-wrap items-center gap-3">
            {#if step === "main"}
              <Button onclick={startMain} disabled={busy || !hasBridge}>
                {#if busy}
                  <LoaderCircle class="size-4 animate-spin" />
                  Starting…
                {:else}
                  Start selling here
                {/if}
              </Button>
            {:else}
              <Button onclick={startClient} disabled={busy}>
                {#if busy}
                  <LoaderCircle class="size-4 animate-spin" />
                  Connecting…
                {:else}
                  Connect and start
                {/if}
              </Button>
            {/if}

            <Button
              variant="ghost"
              onclick={() => {
                step = "role";
                error = null;
              }}
            >
              Change role
            </Button>
          </div>
        </Card>
      </div>
    {/if}
  </main>
</div>
