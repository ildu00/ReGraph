"""CLI entrypoint for the ReGraph provider agent."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.logging import RichHandler
from rich.panel import Panel
from rich.table import Table

from regraph_agent import __version__
from regraph_agent.config import AgentConfig
from regraph_agent.hardware import detect_hardware

console = Console()

DEFAULT_CONFIG = Path.home() / ".regraph" / "config.yaml"


def _setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(message)s",
        datefmt="%H:%M:%S",
        handlers=[RichHandler(
            console=console,
            rich_tracebacks=True,
            show_path=False,
            markup=True,
        )],
    )


@click.group(invoke_without_command=True)
@click.option("--version", is_flag=True, help="Show agent version")
@click.pass_context
def main(ctx: click.Context, version: bool) -> None:
    """ReGraph Provider Agent — contribute compute to the decentralized AI network."""
    if version:
        click.echo(f"regraph-agent {__version__}")
        return
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())


@main.command()
@click.option("--key", required=True, help="Connection key from your ReGraph dashboard")
@click.option("--config", "config_path", default=str(DEFAULT_CONFIG), help="Config file path")
@click.option("--gpu/--cpu-only", "gpu_enabled", default=True, help="Enable/disable GPU")
@click.option("--log-level", default="info", type=click.Choice(["debug", "info", "warning", "error"]))
def start(key: str, config_path: str, gpu_enabled: bool, log_level: str) -> None:
    """Start the provider agent and begin contributing compute."""
    _setup_logging(log_level)

    config = AgentConfig.load(config_path)
    config.network.connection_key = key
    if not gpu_enabled:
        config.compute.gpu_mode = "disabled"

    # Save config for future runs
    config.save(config_path)

    console.print(Panel.fit(
        f"[bold cyan]ReGraph Agent v{__version__}[/bold cyan]\n"
        f"[dim]Connecting to {config.network.api_url}[/dim]",
        border_style="cyan",
    ))

    from regraph_agent.agent import Agent
    agent = Agent(config)

    try:
        agent.start()
    except KeyboardInterrupt:
        agent.stop()
    except Exception as e:
        console.print(f"[red]Fatal error:[/red] {e}")
        sys.exit(1)


@main.command()
@click.option("--config", "config_path", default=str(DEFAULT_CONFIG), help="Config file path")
def run(config_path: str) -> None:
    """Start the agent using an existing config file."""
    _setup_logging("info")

    path = Path(config_path)
    if not path.exists():
        console.print(f"[red]Config not found:[/red] {config_path}")
        console.print("Run [bold]regraph-agent start --key YOUR_KEY[/bold] first.")
        sys.exit(1)

    config = AgentConfig.load(config_path)

    if not config.network.connection_key:
        console.print("[red]No connection key in config.[/red]")
        console.print("Run [bold]regraph-agent start --key YOUR_KEY[/bold] first.")
        sys.exit(1)

    console.print(Panel.fit(
        f"[bold cyan]ReGraph Agent v{__version__}[/bold cyan]\n"
        f"[dim]Connecting to {config.network.api_url}[/dim]",
        border_style="cyan",
    ))

    from regraph_agent.agent import Agent
    agent = Agent(config)

    try:
        agent.start()
    except KeyboardInterrupt:
        agent.stop()
    except Exception as e:
        console.print(f"[red]Fatal error:[/red] {e}")
        sys.exit(1)


@main.command()
@click.option("--gpu/--cpu-only", "gpu_enabled", default=True)
def status(gpu_enabled: bool) -> None:
    """Show detected hardware and system status."""
    _setup_logging("warning")

    gpu_mode = "auto" if gpu_enabled else "disabled"
    hw = detect_hardware(gpu_mode)

    table = Table(title="System Hardware", border_style="cyan")
    table.add_column("Property", style="dim")
    table.add_column("Value", style="bold")

    table.add_row("Hostname", hw.hostname)
    table.add_row("OS / Arch", f"{hw.os} / {hw.arch}")
    table.add_row("Python", hw.python_version)
    table.add_row("CPU", hw.cpu_model or "unknown")
    table.add_row("CPU Cores", str(hw.cpu_cores))
    table.add_row("RAM", f"{hw.ram_total_mb} MB")
    table.add_row("GPU Mode", hw.gpu_mode)

    if hw.gpus:
        for i, g in enumerate(hw.gpus):
            label = f"GPU {i}" if len(hw.gpus) > 1 else "GPU"
            vram = f" ({g.vram_mb} MB VRAM)" if g.vram_mb else ""
            table.add_row(label, f"{g.name}{vram} [{g.backend}]")

    console.print(table)


if __name__ == "__main__":
    main()
