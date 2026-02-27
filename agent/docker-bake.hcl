# ============================================================
# docker-bake.hcl — BuildKit bake file for all agent targets
#
# Usage:
#   docker buildx bake cpu       # Build CPU image
#   docker buildx bake nvidia    # Build NVIDIA/CUDA image
#   docker buildx bake all       # Build all targets
# ============================================================

variable "REGISTRY" {
  default = "ghcr.io/regraph-tech/agent"
}

variable "VERSION" {
  default = "1.2.0"
}

group "all" {
  targets = ["cpu", "nvidia", "ascend", "metal", "dev"]
}

group "gpu" {
  targets = ["nvidia", "ascend"]
}

group "default" {
  targets = ["cpu"]
}

target "cpu" {
  context    = "."
  dockerfile = "Dockerfile"
  target     = "cpu"
  tags = [
    "${REGISTRY}:${VERSION}-cpu",
    "${REGISTRY}:latest-cpu",
    "${REGISTRY}:latest",
  ]
  platforms = ["linux/amd64", "linux/arm64"]
  cache-from = ["type=gha,scope=cpu"]
  cache-to   = ["type=gha,mode=max,scope=cpu"]
}

target "nvidia" {
  context    = "."
  dockerfile = "Dockerfile"
  target     = "nvidia"
  tags = [
    "${REGISTRY}:${VERSION}-nvidia",
    "${REGISTRY}:latest-nvidia",
  ]
  platforms  = ["linux/amd64"]
  cache-from = ["type=gha,scope=nvidia"]
  cache-to   = ["type=gha,mode=max,scope=nvidia"]
}

target "ascend" {
  context    = "."
  dockerfile = "Dockerfile"
  target     = "ascend"
  tags = [
    "${REGISTRY}:${VERSION}-ascend",
    "${REGISTRY}:latest-ascend",
  ]
  # Ascend NPUs run on amd64 (Atlas 300I/T/A) and arm64 (Atlas 200/800)
  platforms  = ["linux/amd64", "linux/arm64"]
  cache-from = ["type=gha,scope=ascend"]
  cache-to   = ["type=gha,mode=max,scope=ascend"]
  args = {
    CANN_VERSION = "8.0.RC3"
  }
}

target "metal" {
  context    = "."
  dockerfile = "Dockerfile"
  target     = "metal"
  tags = [
    "${REGISTRY}:${VERSION}-metal",
    "${REGISTRY}:latest-metal",
  ]
  platforms  = ["linux/arm64", "linux/amd64"]
  cache-from = ["type=gha,scope=metal"]
  cache-to   = ["type=gha,mode=max,scope=metal"]
}

target "dev" {
  context    = "."
  dockerfile = "Dockerfile"
  target     = "dev"
  tags       = ["${REGISTRY}:dev"]
  platforms  = ["linux/amd64", "linux/arm64"]
}
