import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'

import { CreepingLineAheadSearch, SectorSearch } from '@canterbury-air-patrol/sar-search-patterns'
import { SearchDisplay, SearchConfiguration } from '@canterbury-air-patrol/sar-search-patterns/react'
import { Distance, Speed, Time } from '@canterbury-air-patrol/speed-time-distance'
import { SpeedTimeDistanceUI } from '@canterbury-air-patrol/speed-time-distance/react'
import { Button, ButtonGroup } from 'react-bootstrap'

const SearchTimer = ({ runTime, run, complete }) => {
  const [remainingTime, setRemainingTime] = useState(runTime)
  const [running, setRunning] = useState(run)

  const updateRemainingTime = () => {
    if (running) {
      if (remainingTime <= 1) {
        setRunning(false)
        if (complete !== undefined) {
          complete()
        }
      }
      setRemainingTime(remainingTime - 1)
    }
  }

  useEffect(() => {
    const interval = setInterval(() => { updateRemainingTime() }, 1000)

    return () => clearInterval(interval)
  }, [remainingTime])

  return (<>Turn in: {remainingTime} seconds</>)
}
SearchTimer.propTypes = {
  runTime: PropTypes.number.isRequired,
  run: PropTypes.bool,
  complete: PropTypes.func
}

class SearchRunner extends React.Component {
  constructor (props) {
    super(props)
    this.onChangeSpeed = this.onChangeSpeed.bind(this)
    this.onChangeTime = this.onChangeTime.bind(this)
    this.onCompleteTimer = this.onCompleteTimer.bind(this)
    this.handleReset = this.handleReset.bind(this)
    this.handlePause = this.handlePause.bind(this)
    this.handleRun = this.handleRun.bind(this)
    this.handleBackLeg = this.handleBackLeg.bind(this)
    this.handleSkipLeg = this.handleSkipLeg.bind(this)

    this.state = {
      legTime: 10,
      search: this.props.search === undefined ? new CreepingLineAheadSearch(200, 1000, 5, 0) : this.props.search,
      running: false,
      searchLeg: 1,
      speed: new Speed(40, 'knots')
    }
  }

  onChangeTime (newTime) {
    this.setState({
      time: newTime
    })
  }

  onChangeSpeed (newSpeed) {
    this.setState({
      speed: newSpeed
    })
  }

  onCompleteTimer () {
    this.setState(function (oldState) {
      oldState.search.nextLeg()
      if (oldState.search.complete && this.props.complete) {
        this.props.complete()
      }
      return {
        search: oldState.search,
        searchLeg: oldState.search.currentLeg
      }
    })
  }

  handleReset () {
    this.setState(function (oldState) {
      oldState.search.currentLeg = 1
      return {
        search: oldState.search,
        searchLeg: 1,
        running: false
      }
    })
  }

  handlePause () {
    this.setState({
      running: false
    })
  }

  handleRun () {
    this.setState({
      running: true
    })
  }

  handleBackLeg () {
    this.setState(function (oldState) {
      oldState.search.currentLeg--
      return {
        search: oldState.search,
        searchLeg: oldState.search.currentLeg
      }
    })
  }

  handleSkipLeg () {
    this.setState(function (oldState) {
      oldState.search.currentLeg++
      return {
        search: oldState.search,
        searchLeg: oldState.search.currentLeg
      }
    })
  }

  humanBearing (bearing) {
    if (bearing < 10) {
      return `00${bearing}`
    }
    if (bearing < 100) {
      return `0${bearing}`
    }
    return `${bearing}`
  }

  render () {
    const distance = new Distance(this.state.search.complete ? this.state.search.sweepWidth : this.state.search.leg.distance, 'm')
    const time = new Time(distance.getDistance('m') / this.state.speed.getSpeed('m/s'), 'seconds')
    const buttons = []
    if (this.state.search.complete || this.state.searchLeg > 1) {
      buttons.push((<Button key='reset' onClick={this.handleReset}>Reset</Button>))
    }
    if (!this.state.search.complete) {
      if (this.state.running) {
        buttons.push((<Button key='pause' onClick={this.handlePause}>Pause</Button>))
      } else {
        if (this.state.searchLeg > 1) {
          buttons.push((<Button key='back' onClick={this.handleBackLeg}>Previous</Button>))
          buttons.push((<Button key='resume' onClick={this.handleRun}>Resume</Button>))
        } else {
          buttons.push((<Button key='run' onClick={this.handleRun}>Run</Button>))
        }
        if (!this.state.search.complete) {
          buttons.push((<Button key='skip' onClick={this.handleSkipLeg}>Skip</Button>))
        }
      }
    }

    let timer = (<></>)
    let instructionText = 'Complete'
    if (!this.state.search.complete) {
      if (this.state.running) {
        timer = (<h1><SearchTimer key={'timer' + this.state.searchLeg} runTime={Math.round(time.getTime('seconds'))} run={this.state.running} complete={this.onCompleteTimer} /></h1>)
      }
      instructionText = `Head ${this.humanBearing(this.state.search.leg.bearing)}`
      if (this.state.search.currentLeg + 1 <= this.state.search.searchLegs.length) {
        instructionText += `, Next: ${this.humanBearing(this.state.search.searchLegs[this.state.search.currentLeg].bearing)}`
      }
    }
    const instruction = (<h1>{instructionText}</h1>)

    return (
      <>
        <SpeedTimeDistanceUI
          key={'std' + this.state.searchLeg}
          calculate='time'
          lockSelector
          lockDistance
          speed={this.state.speed}
          distance={distance}
          time={time}
          updateTime={this.onChangeTime}
          updateSpeed={this.onChangeSpeed}
        />
        <ButtonGroup>{buttons}</ButtonGroup>
        {timer}
        {instruction}
        <SearchDisplay key={'display' + this.state.searchLeg} search={this.state.search} />
      </>
    )
  }
}
SearchRunner.propTypes = {
  search: PropTypes.object,
  complete: PropTypes.func
}

class SearchRunnerConfiguration extends React.Component {
  constructor (props) {
    super(props)
    this.onChangeSearch = this.onChangeSearch.bind(this)
    this.state = {
      search: new SectorSearch(200, 1, 1, 0)
    }
  }

  onChangeSearch (search) {
    this.setState({
      search
    })
  }

  render () {
    return (
      <>
        <SearchConfiguration updateSearch={this.onChangeSearch} />
        <SearchRunner key={`${this.state.search.searchType}-${this.state.search.sweepWidth}-${this.state.search.multiplier}-${this.state.search.iterations}-${this.state.search.legs}-${this.state.search.legLength}-${this.state.search.startingDirection}-${this.state.search.progressDirection}`} search={this.state.search} />
      </>
    )
  }
}

export { SearchRunner, SearchRunnerConfiguration }
