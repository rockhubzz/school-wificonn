# 2026-07-20 08:12:18 by RouterOS 7.23
# software id = 4SVX-D6HP
#
/interface bridge
add comment="enable vlan-filtering at end" name=bridge-trunk vlan-filtering=\
    yes
/interface ethernet
set [ find default-name=ether1 ] disable-running-check=no
set [ find default-name=ether2 ] disable-running-check=no
set [ find default-name=ether3 ] disable-running-check=no
set [ find default-name=ether4 ] disable-running-check=no
/interface vlan
add interface=bridge-trunk name=vlan10-server vlan-id=10
add interface=bridge-trunk name=vlan20-staff vlan-id=20
add interface=bridge-trunk name=vlan30-students vlan-id=30
/interface wireless security-profiles
set [ find default=yes ] supplicant-identity=MikroTik
/iot wiliot servers
set *1 address=mqtt.us-east-2.prod.wiliot.cloud name="Wiliot US East"
/ip hotspot profile
add dns-name=hotspot.school.lan hotspot-address=192.168.30.1 login-by=\
    mac,http-pap mac-auth-mode=mac-as-username-and-password name=\
    students-hsprof
/ip hotspot user profile
add name=student-profile
/ip pool
add name=pool-vlan10 ranges=192.168.10.10-192.168.10.100
add name=pool-vlan20 ranges=192.168.20.100-192.168.20.200
add name=pool-vlan30 ranges=192.168.30.2-192.168.30.250
add name=hs-pool-30 ranges=192.168.30.100-192.168.30.250
/ip dhcp-server
add address-pool=pool-vlan10 interface=vlan10-server name=dhcp10
add address-pool=pool-vlan20 interface=vlan20-staff name=dhcp20
add address-pool=pool-vlan30 interface=vlan30-students name=dhcp30
/user group
add name=portal-api policy="read,write,policy,test,sensitive,api,!local,!telne\
    t,!ssh,!ftp,!reboot,!winbox,!password,!web,!sniff,!romon,!rest-api"
/interface bridge port
add bridge=bridge-trunk comment="access port: VLAN 10 (server)" frame-types=\
    admit-only-untagged-and-priority-tagged interface=ether2 pvid=10
add bridge=bridge-trunk comment="access port: VLAN 20 (staff)" frame-types=\
    admit-only-untagged-and-priority-tagged interface=ether3 pvid=20
add bridge=bridge-trunk comment="access port: VLAN 30 (students)" \
    frame-types=admit-only-untagged-and-priority-tagged interface=ether4 \
    pvid=30
/interface bridge vlan
add bridge=bridge-trunk tagged=bridge-trunk untagged=ether2 vlan-ids=10
add bridge=bridge-trunk tagged=bridge-trunk untagged=ether3 vlan-ids=20
add bridge=bridge-trunk tagged=bridge-trunk untagged=ether4 vlan-ids=30
/ip address
add address=192.168.10.1/24 interface=vlan10-server network=192.168.10.0
add address=192.168.20.1/24 interface=vlan20-staff network=192.168.20.0
add address=192.168.30.1/24 interface=vlan30-students network=192.168.30.0
/ip dhcp-client
add comment="WAN uplink" interface=ether1 name=client1
/ip dhcp-server lease
add address=192.168.10.10 client-id=\
    ff:2b:94:34:c1:0:2:0:0:ab:11:6e:99:d2:3a:a0:31:e3:ce mac-address=\
    00:0C:29:DF:D3:CB server=dhcp10
/ip dhcp-server network
add address=192.168.10.0/24 dns-server=192.168.10.1 gateway=192.168.10.1
add address=192.168.20.0/24 dns-server=192.168.20.1 gateway=192.168.20.1
add address=192.168.30.0/24 dns-server=192.168.30.1 gateway=192.168.30.1
/ip dns
set allow-remote-requests=yes servers=1.1.1.1,9.9.9.9
/ip dns static
add address=192.168.10.10 comment="controller hostname" name=wificonn.lan \
    type=A
/ip firewall filter
add action=passthrough chain=unused-hs-chain comment=\
    "place hotspot rules here" disabled=yes
add action=accept chain=input comment=established/related connection-state=\
    established,related
add action=drop chain=input comment="drop invalid" connection-state=invalid
add action=accept chain=input comment="allow ICMP" protocol=icmp
add action=accept chain=input comment="trust server VLAN" in-interface=\
    vlan10-server
add action=accept chain=input dst-port=53 in-interface=vlan20-staff protocol=\
    udp
add action=accept chain=input dst-port=53 in-interface=vlan30-students \
    protocol=udp
add action=accept chain=input dst-port=53 in-interface=vlan20-staff protocol=\
    tcp
add action=accept chain=input dst-port=53 in-interface=vlan30-students \
    protocol=tcp
add action=drop chain=input comment="drop other LAN to router" in-interface=\
    !ether1
add action=drop chain=input comment="drop WAN to router" in-interface=ether1
add action=accept chain=forward connection-state=established,related
add action=drop chain=forward connection-state=invalid
add action=accept chain=forward in-interface=vlan10-server out-interface=\
    ether1
add action=accept chain=forward in-interface=vlan20-staff out-interface=\
    ether1
add action=accept chain=forward in-interface=vlan30-students out-interface=\
    ether1
add action=accept chain=forward comment="students -> portal server" \
    dst-address=192.168.10.10 in-interface=vlan30-students out-interface=\
    vlan10-server
add action=accept chain=forward comment="portal server -> students" \
    in-interface=vlan10-server out-interface=vlan30-students src-address=\
    192.168.10.10
add action=accept chain=forward comment="staff -> portal server" dst-address=\
    192.168.10.10 in-interface=vlan20-staff out-interface=vlan10-server
add action=accept chain=forward comment="students -> portal http" \
    dst-address=192.168.10.10 dst-port=80 in-interface=vlan30-students \
    out-interface=vlan10-server protocol=tcp
add action=accept chain=forward comment="students -> portal https" \
    dst-address=192.168.10.10 dst-port=443 in-interface=vlan30-students \
    out-interface=vlan10-server protocol=tcp
add action=accept chain=forward in-interface=vlan20-staff out-interface=\
    vlan10-server
add action=accept chain=forward in-interface=vlan10-server out-interface=\
    vlan20-staff
add action=drop chain=forward in-interface=vlan30-students out-interface=\
    vlan10-server
add action=drop chain=forward in-interface=vlan30-students out-interface=\
    vlan20-staff
add action=drop chain=forward in-interface=vlan20-staff out-interface=\
    vlan30-students
/ip firewall nat
add action=passthrough chain=unused-hs-chain comment=\
    "place hotspot rules here" disabled=yes
add action=masquerade chain=srcnat comment="NAT to internet" out-interface=\
    ether1
/ip hotspot
add address-pool=hs-pool-30 disabled=no interface=vlan30-students name=\
    hs-vlan30 profile=students-hsprof
/ip hotspot user
add comment="2341720197 - Rocky Alessandro Kristanto" mac-address=\
    00:0C:29:2E:B7:A7 name=00:0C:29:2E:B7:A7 profile=student-profile
/ip hotspot walled-garden
add comment="place hotspot rules here" disabled=yes
/ip hotspot walled-garden ip
add action=accept disabled=no dst-address=192.168.10.10 dst-port=80 protocol=\
    tcp
add action=accept disabled=no dst-address=192.168.10.10 dst-port=443 \
    protocol=tcp
add action=accept disabled=no dst-address=192.168.30.1 dst-port=53 protocol=\
    udp
add action=accept disabled=no dst-address=192.168.30.1 dst-port=53 protocol=\
    tcp
/ip service
set ftp disabled=yes
set ssh address=192.168.10.0/24
set telnet disabled=yes
set winbox address=192.168.10.0/24
set api address=192.168.10.0/24
set api-ssl disabled=yes
/system identity
set name=school-edge
